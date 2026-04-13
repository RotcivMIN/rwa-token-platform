// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRWAToken — RWA (Real World Asset) 代币接口
 * @notice 定义 RWA 合规代币的标准行为：白名单管控、铸造/销毁、软失败转账
 * @dev 配合 ERC-20 使用，为受监管的现实资产代币化提供合规层
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  设计哲学 (Design Philosophy)                        │
 * │  1. 白名单准入 — 只有 KYC 通过的地址可持有/转让      │
 * │  2. 双模式转账 — transfer() 硬失败, tryTransfer() 软失败 │
 * │  3. 完整审计 — 所有关键操作都发出事件                 │
 * └─────────────────────────────────────────────────────┘
 */
interface IRWAToken {
    // ═══════════════════════════════════════════════════
    //                    事件 (Events)
    // ═══════════════════════════════════════════════════

    /// @notice 管理员权限变更时触发
    /// @param account 目标地址
    /// @param status  true=授予管理员, false=撤销管理员
    event AdminUpdated(address indexed account, bool status);

    /// @notice 白名单状态变更时触发
    /// @param account 目标地址
    /// @param status  true=加入白名单, false=移出白名单
    event WhitelistUpdated(address indexed account, bool status);

    /// @notice 转账被合规规则阻止时触发（不回滚，仅记录）
    /// @param from   发送方地址
    /// @param to     接收方地址
    /// @param reason 阻止原因（人类可读字符串）
    event TransactionBlocked(address indexed from, address indexed to, string reason);

    /// @notice 代币铸造时触发
    /// @param to     接收方地址
    /// @param amount 铸造数量（wei 单位）
    /// @param reason 铸造原因说明
    event TokensMinted(address indexed to, uint256 amount, string reason);

    /// @notice 代币销毁时触发
    /// @param from   被销毁地址
    /// @param amount 销毁数量（wei 单位）
    /// @param reason 销毁原因说明
    event TokensBurned(address indexed from, uint256 amount, string reason);

    // ═══════════════════════════════════════════════════
    //              管理员管理 (Admin Management)
    // ═══════════════════════════════════════════════════

    /// @notice 添加管理员（仅合约所有者）
    /// @param account 要授予管理员权限的地址
    function addAdmin(address account) external;

    /// @notice 移除管理员（仅合约所有者）
    /// @param account 要撤销管理员权限的地址
    function removeAdmin(address account) external;

    /// @notice 查询地址是否为管理员
    /// @param account 查询的地址
    /// @return 是否为管理员（owner 始终返回 true）
    function isAdmin(address account) external view returns (bool);

    // ═══════════════════════════════════════════════════
    //               白名单管理 (Whitelist)
    // ═══════════════════════════════════════════════════

    /// @notice 将地址加入白名单（仅管理员）
    /// @param account 要加入白名单的地址
    function addToWhitelist(address account) external;

    /// @notice 将地址移出白名单（仅管理员）
    /// @param account 要移出白名单的地址
    function removeFromWhitelist(address account) external;

    /// @notice 查询地址是否在白名单中
    /// @param account 查询的地址
    /// @return 是否在白名单中
    function isWhitelisted(address account) external view returns (bool);

    /// @notice 获取白名单地址总数
    /// @return 当前白名单中的地址数量
    function getWhitelistCount() external view returns (uint256);

    // ═══════════════════════════════════════════════════
    //             铸造与销毁 (Mint & Burn)
    // ═══════════════════════════════════════════════════

    /// @notice 铸造代币到指定地址（仅管理员，目标须在白名单中）
    /// @param to     接收铸造代币的地址
    /// @param amount 铸造数量
    function mint(address to, uint256 amount) external;

    /// @notice 从指定地址销毁代币（仅管理员，目标须在白名单中）
    /// @param from   被销毁代币的地址
    /// @param amount 销毁数量
    function burn(address from, uint256 amount) external;

    // ═══════════════════════════════════════════════════
    //            软失败转账 (Soft-fail Transfer)
    // ═══════════════════════════════════════════════════

    /// @notice 尝试转账 — 被阻止时不回滚，而是记录并返回 false
    /// @dev    与标准 transfer() 不同：不满足条件时不会 revert
    ///         适用于批量转账场景，单笔失败不影响整批
    /// @param to     接收方地址
    /// @param amount 转账数量
    /// @return success 转账是否成功
    function tryTransfer(address to, uint256 amount) external returns (bool success);

    // ═══════════════════════════════════════════════════
    //              审计查询 (Audit Queries)
    // ═══════════════════════════════════════════════════

    /// @notice 获取被阻止的交易总数
    /// @return 历史上被阻止的交易计数
    function getBlockedTransactionCount() external view returns (uint256);
}
