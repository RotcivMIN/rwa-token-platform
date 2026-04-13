// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IRWAToken.sol";

/**
 * @title RWAToken — 合规型 RWA (Real World Asset) ETF 代币
 * @author QF5208 Course Project
 * @notice 实现白名单准入、软失败转账、完整审计日志的 ERC-20 代币
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  架构概览 (Architecture Overview)                         │
 * │                                                          │
 * │  OpenZeppelin v5 继承链:                                  │
 * │    ERC20        — 标准代币逻辑                            │
 * │    Ownable      — 管理员权限 (constructor 传入 admin)      │
 * │    Pausable     — 紧急暂停机制                            │
 * │    IRWAToken    — RWA 合规接口                            │
 * │                                                          │
 * │  核心机制:                                                │
 * │    _update()      → 拦截所有转账，硬性白名单检查           │
 * │    tryTransfer()  → 软失败路径，不 revert 只记录           │
 * │    BlockedTx[]    → 链上审计日志                          │
 * └──────────────────────────────────────────────────────────┘
 */
contract RWAToken is ERC20, Ownable, Pausable, IRWAToken {
    // ═══════════════════════════════════════════════════
    //            数据结构 (Data Structures)
    // ═══════════════════════════════════════════════════

    /// @notice 被阻止的交易记录（链上审计用）
    struct BlockedTransaction {
        address from;       // 发送方
        address to;         // 接收方
        uint256 amount;     // 转账金额
        string reason;      // 阻止原因
        uint256 timestamp;  // 区块时间戳
    }

    // ═══════════════════════════════════════════════════
    //             状态变量 (State Variables)
    // ═══════════════════════════════════════════════════

    /// @dev 白名单映射：address → 是否在白名单中
    mapping(address => bool) private _whitelist;

    /// @dev 管理员映射：address → 是否为管理员（owner 始终为管理员）
    mapping(address => bool) private _admins;

    /// @dev 白名单地址数组（用于链上枚举遍历）
    address[] private _whitelistedAddresses;

    /// @dev 被阻止交易的计数器
    uint256 private _blockedTxCount;

    /// @dev 被阻止交易的完整记录数组
    BlockedTransaction[] private _blockedTransactions;

    // ═══════════════════════════════════════════════════
    //               构造函数 (Constructor)
    // ═══════════════════════════════════════════════════

    /**
     * @notice 部署 RWA 代币合约
     * @dev    OZ v5 要求: Ownable(admin_) 显式传入初始管理员
     * @param name_          代币名称 (e.g. "RWA ETF Gold")
     * @param symbol_        代币符号 (e.g. "RWAG")
     * @param initialSupply_ 初始铸造量 (wei 单位，必须 > 0)
     * @param admin_         管理员地址 (同时获得初始代币 + 白名单资格)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address admin_
    ) ERC20(name_, symbol_) Ownable(admin_) {
        // 参数校验
        require(initialSupply_ > 0, "RWAToken: initial supply must be > 0");
        require(admin_ != address(0), "RWAToken: admin cannot be zero address");

        // 自动将管理员加入白名单
        _whitelist[admin_] = true;
        _whitelistedAddresses.push(admin_);
        emit WhitelistUpdated(admin_, true);

        // 铸造初始供应量给管理员
        _mint(admin_, initialSupply_);
        emit TokensMinted(admin_, initialSupply_, "Initial supply minting");
    }

    // ═══════════════════════════════════════════════════
    //           权限修饰符 (Access Modifier)
    // ═══════════════════════════════════════════════════

    /// @dev owner 或已授权 admin 均可调用
    modifier onlyAdmin() {
        require(msg.sender == owner() || _admins[msg.sender], "RWAToken: caller is not admin");
        _;
    }

    // ═══════════════════════════════════════════════════
    //         管理员管理 (Admin Management)
    // ═══════════════════════════════════════════════════

    /// @inheritdoc IRWAToken
    function addAdmin(address account) external onlyOwner {
        require(account != address(0), "RWAToken: cannot add zero address as admin");
        require(!_admins[account], "RWAToken: already an admin");

        _admins[account] = true;
        emit AdminUpdated(account, true);
    }

    /// @inheritdoc IRWAToken
    function removeAdmin(address account) external onlyOwner {
        require(_admins[account], "RWAToken: not an admin");
        _admins[account] = false;
        emit AdminUpdated(account, false);
    }

    /// @inheritdoc IRWAToken
    function isAdmin(address account) external view returns (bool) {
        return account == owner() || _admins[account];
    }

    // ═══════════════════════════════════════════════════
    //         白名单管理 (Whitelist Management)
    // ═══════════════════════════════════════════════════

    /// @inheritdoc IRWAToken
    function addToWhitelist(address account) external onlyAdmin {
        require(account != address(0), "RWAToken: cannot whitelist zero address");
        require(!_whitelist[account], "RWAToken: already whitelisted");

        _whitelist[account] = true;
        _whitelistedAddresses.push(account);

        emit WhitelistUpdated(account, true);
    }

    /// @inheritdoc IRWAToken
    function removeFromWhitelist(address account) external onlyAdmin {
        require(_whitelist[account], "RWAToken: not whitelisted");

        _whitelist[account] = false;

        // 从数组中移除（swap-and-pop 模式，节省 gas）
        uint256 len = _whitelistedAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            if (_whitelistedAddresses[i] == account) {
                _whitelistedAddresses[i] = _whitelistedAddresses[len - 1];
                _whitelistedAddresses.pop();
                break;
            }
        }

        emit WhitelistUpdated(account, false);
    }

    /// @inheritdoc IRWAToken
    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    /// @inheritdoc IRWAToken
    function getWhitelistCount() external view returns (uint256) {
        return _whitelistedAddresses.length;
    }

    /// @notice 获取所有白名单地址（便于前端展示）
    /// @return 白名单地址数组
    function getWhitelistedAddresses() external view returns (address[] memory) {
        return _whitelistedAddresses;
    }

    // ═══════════════════════════════════════════════════
    //           铸造与销毁 (Mint & Burn)
    // ═══════════════════════════════════════════════════

    /// @inheritdoc IRWAToken
    function mint(address to, uint256 amount) external onlyAdmin {
        require(_whitelist[to], "RWAToken: recipient not whitelisted");
        require(amount > 0, "RWAToken: mint amount must be > 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, "Owner minting");
    }

    /// @inheritdoc IRWAToken
    function burn(address from, uint256 amount) external onlyAdmin {
        require(_whitelist[from], "RWAToken: target not whitelisted");
        require(amount > 0, "RWAToken: burn amount must be > 0");

        _burn(from, amount);
        emit TokensBurned(from, amount, "Owner burning");
    }

    // ═══════════════════════════════════════════════════
    //           暂停控制 (Pause Control)
    // ═══════════════════════════════════════════════════

    /// @notice 紧急暂停所有代币转移（仅管理员）
    function pause() external onlyAdmin {
        _pause();
    }

    /// @notice 恢复代币转移（仅管理员）
    function unpause() external onlyAdmin {
        _unpause();
    }

    // ═══════════════════════════════════════════════════
    //       软失败转账 (Soft-fail Transfer)
    // ═══════════════════════════════════════════════════

    /**
     * @inheritdoc IRWAToken
     * @dev 实现逻辑:
     *   1. 预检查暂停状态 → 不满足则记录 + return false
     *   2. 预检查发送方白名单 → 不满足则记录 + return false
     *   3. 预检查接收方白名单 → 不满足则记录 + return false
     *   4. 全部通过 → 调用内部 _transfer()（会经过 _update 但必然通过）
     *
     *   与 transfer() 的区别:
     *   ┌──────────────┬─────────────────┬──────────────────┐
     *   │              │ transfer()      │ tryTransfer()    │
     *   ├──────────────┼─────────────────┼──────────────────┤
     *   │ 失败行为     │ revert (回滚)   │ return false     │
     *   │ Gas 退还     │ 是              │ 否（已消耗）     │
     *   │ 事件         │ 无              │ TransactionBlocked│
     *   │ 审计记录     │ 无（tx失败）    │ 有（链上存储）   │
     *   └──────────────┴─────────────────┴──────────────────┘
     */
    function tryTransfer(address to, uint256 amount) external returns (bool success) {
        // 检查暂停状态
        if (paused()) {
            _recordBlockedTransaction(msg.sender, to, amount, "Token transfers are paused");
            return false;
        }

        // 检查发送方白名单
        if (!_whitelist[msg.sender]) {
            _recordBlockedTransaction(msg.sender, to, amount, "Sender not whitelisted");
            return false;
        }

        // 检查接收方白名单
        if (!_whitelist[to]) {
            _recordBlockedTransaction(msg.sender, to, amount, "Recipient not whitelisted");
            return false;
        }

        // 所有检查通过，执行转账
        _transfer(msg.sender, to, amount);
        return true;
    }

    // ═══════════════════════════════════════════════════
    //            审计查询 (Audit Queries)
    // ═══════════════════════════════════════════════════

    /// @inheritdoc IRWAToken
    function getBlockedTransactionCount() external view returns (uint256) {
        return _blockedTxCount;
    }

    /// @notice 获取指定索引的被阻止交易详情
    /// @param index 交易索引 (0-based)
    /// @return from      发送方
    /// @return to        接收方
    /// @return amount    金额
    /// @return reason    阻止原因
    /// @return timestamp 时间戳
    function getBlockedTransaction(uint256 index)
        external
        view
        returns (
            address from,
            address to,
            uint256 amount,
            string memory reason,
            uint256 timestamp
        )
    {
        require(index < _blockedTransactions.length, "RWAToken: index out of bounds");
        BlockedTransaction storage txRecord = _blockedTransactions[index];
        return (txRecord.from, txRecord.to, txRecord.amount, txRecord.reason, txRecord.timestamp);
    }

    // ═══════════════════════════════════════════════════
    //         内部函数 (Internal Functions)
    // ═══════════════════════════════════════════════════

    /**
     * @dev 重写 OZ v5 的 _update() — 这是 ERC-20 所有代币移动的核心钩子
     *      替代 OZ v4 的 _beforeTokenTransfer()
     *
     *      拦截规则:
     *        - from == 0 → 铸造，不检查白名单（mint函数已做检查）
     *        - to == 0   → 销毁，不检查白名单（burn函数已做检查）
     *        - 其他      → 普通转账，双方必须在白名单 + 未暂停
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // 暂停检查：铸造和销毁也受暂停影响（标准做法）
        // 但构造函数中的 _mint 不受影响，因为此时 paused() == false
        // OZ v5: _requireNotPaused() 抛出 EnforcedPause() 自定义错误
        _requireNotPaused();

        // 白名单检查：仅针对普通转账（非铸造、非销毁）
        if (from != address(0) && to != address(0)) {
            require(_whitelist[from], "RWAToken: sender not whitelisted");
            require(_whitelist[to], "RWAToken: recipient not whitelisted");
        }

        // 调用父合约的 _update 完成实际余额变更
        super._update(from, to, value);
    }

    /**
     * @dev 记录被阻止的交易（内部辅助函数）
     *      同时递增计数器、存储详细记录、发出事件
     */
    function _recordBlockedTransaction(
        address from,
        address to,
        uint256 amount,
        string memory reason
    ) private {
        _blockedTxCount++;
        _blockedTransactions.push(
            BlockedTransaction({
                from: from,
                to: to,
                amount: amount,
                reason: reason,
                timestamp: block.timestamp
            })
        );
        emit TransactionBlocked(from, to, reason);
    }
}
