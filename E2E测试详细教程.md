# 🎓 RWA ETF Token Platform — E2E 操作教程（详细版）

> 📅 日期: 2026-03-26
> 🎯 目标: 从零开始操作 dApp，解决所有常见问题

---

## ⚡ 第一步：启动前端

打开 **Windows Terminal / CMD / PowerShell**，输入：

```cmd
E:
cd "E:\5208 token Tech\rwa-token-platform"
yarn start
```

看到 `✓ Ready in X.Xs` 就成功了。

> ⚠️ 第一次打开每个页面会编译 15-20 秒，这是正常的（开发模式）。
> 第二次打开同一页面就是 50ms 秒开。

---

## 🦊 第二步：MetaMask 配置（最关键！）

### 2.1 确保 MetaMask 在 Sepolia 网络

这是 **"Wrong Network"** 的唯一原因：MetaMask 当前不在 Sepolia。

```
操作步骤:
1. 点击 MetaMask 扩展图标（浏览器右上角的狐狸🦊）
2. 点击左上角的网络名称（可能显示 "Ethereum Mainnet"）
3. 如果看不到 Sepolia，点底部 "Show test networks" 开关
4. 选择 "Sepolia"
5. 确认切换
```

### 2.2 为什么刷新后会变成 "Wrong Network"？

```
原因：MetaMask 有自己的"默认网络"设置。
     当你刷新页面时，Wagmi 重新连接 MetaMask，
     如果 MetaMask 回到了默认网络（通常是 Ethereum Mainnet），
     而我们的 dApp 只接受 Sepolia → 就显示 "Wrong Network"。

解决：
  方法 1: 页面上红色 "Wrong network" 按钮 → 下拉 → 点 "Switch to Sepolia"
  方法 2: 直接在 MetaMask 切换到 Sepolia
  方法 3: 把 MetaMask 默认网络改成 Sepolia（一劳永逸）
          MetaMask → Settings → Networks → Sepolia → Set as default
```

### 2.3 导入管理员账户

你的部署者地址 = 合约管理员 = `0xf4B9B94F3a8Eeeb0957b221f5249F50d9ef89420`

```
1. 打开 MetaMask
2. 点右上角头像 → "Add account or hardware wallet" → "Import account"
3. 选 "Private Key"
4. 打开文件 E:\5208 token Tech\rwa-token-platform\packages\hardhat\.env
5. 复制 __RUNTIME_DEPLOYER_PRIVATE_KEY= 后面的值
6. 粘贴到 MetaMask → Import
7. 确认地址显示为 0xf4B9...9420
```

### 2.4 领取 Sepolia 测试 ETH

操作合约需要 Gas（ETH 作为手续费）。免费领取：

- **Google 水龙头**（推荐）: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- **Infura 水龙头**: https://www.infura.io/faucet/sepolia

输入你的地址 `0xf4B9B94F3a8Eeeb0957b221f5249F50d9ef89420`，等 10-30 秒到账。

---

## 🔗 第三步：连接钱包到 dApp

```
1. 浏览器打开 http://localhost:3000
2. 确保 MetaMask 已在 Sepolia 网络!!! （看第二步）
3. 点击右上角 "Connect Wallet"
4. 选择 "MetaMask"
5. MetaMask 弹窗 → "Connect" → 确认

✅ 成功标志：右上角显示你的地址和 ETH 余额，网络名 "Sepolia"
❌ 如果显示红色 "Wrong network" → 点击它 → "Switch to Sepolia"
```

---

## 📊 第四步：测试 Dashboard（首页）

路径: http://localhost:3000

你应该看到 6 个数据卡片：

| 卡片               | 预期值                 |
| ---------------- | ------------------- |
| Token Name       | RWA ETF Gold        |
| Symbol           | RWAG                |
| Total Supply     | 1,000,000           |
| Your Balance     | 1,000,000（管理员持有全部）  |
| Whitelist Status | ✅ Whitelisted       |
| Contract Status  | Active (Not Paused) |

> 如果数据显示 "—" 或 loading，等 5-10 秒（RPC 请求中）。

---

## ✅ 第五步：添加白名单地址（你遇到的问题）

路径: http://localhost:3000/whitelist

### 完整操作流程：

```
前提：
  ✅ MetaMask 在 Sepolia 网络
  ✅ 已连接管理员账户 (0xf4B9...9420)
  ✅ 账户有测试 ETH（至少 0.001 ETH）

步骤：
  1. 在 "Add Address" 输入框填入要添加的地址
     例: 0x0000000000000000000000000000000000000001

  2. 点击 "Add to Whitelist" 按钮

  3. ⚠️ 重要！此时会出现以下状态之一:

     情况 A: MetaMask 弹窗请求确认
       → 点击 MetaMask 弹窗中的 "Confirm"
       → 等待 15-30 秒（链上确认）
       → 页面显示成功通知

     情况 B: 页面显示 "waiting for user confirmation"
       → 但没看到 MetaMask 弹窗？
       → 点击浏览器右上角的 MetaMask 狐狸图标 🦊
       → MetaMask 里面有一个等待确认的交易
       → 点 "Confirm"

     情况 C: 报错 "Wrong network"
       → MetaMask 切换到 Sepolia（见第二步）
       → 重新操作

  4. ❌ 不要在等待确认时刷新页面!!!
     刷新会断开连接，交易被取消，
     MetaMask 可能切回默认网络 → 显示 "Wrong network"

  5. 操作成功后，白名单计数 +1，下方表格出现新地址
```

### ⚠️ "Waiting for user confirmation" 看不到 MetaMask 弹窗？

这是最常见的问题。MetaMask 的确认弹窗有时不会自动弹出。

```
解决方案（按顺序试）:

1. 点击浏览器工具栏的 MetaMask 狐狸图标 🦊
   → 看是否有待确认的交易 → 点 Confirm

2. 如果 MetaMask 显示空白:
   → 可能交易模拟失败了
   → 查看页面是否有红色错误通知
   → 常见原因: 没有 ETH 支付 Gas / 地址格式错误

3. 如果还不行:
   → 刷新页面
   → 重新连接钱包（确保在 Sepolia）
   → 重新操作
```

---

## 🔨 第六步：铸造代币 (Mint)

路径: http://localhost:3000/mint-burn

```
1. 在 Mint 区域:
   - To Address: 0xf4B9B94F3a8Eeeb0957b221f5249F50d9ef89420（你自己）
   - Amount: 1000
   - Reason: Test mint

2. 点 "Mint" → MetaMask 确认（别忘了点狐狸图标看弹窗!）

3. 成功后: Total Supply 变成 1,001,000
```

---

## 🔥 第七步：销毁代币 (Burn)

同一页面 http://localhost:3000/mint-burn

```
1. 在 Burn 区域:
   - From Address: 0xf4B9B94F3a8Eeeb0957b221f5249F50d9ef89420
   - Amount: 500
   - Reason: Test redemption

2. 点 "Burn" → MetaMask 确认

3. 成功后: Total Supply 变成 1,000,500
```

---

## ⏸️ 第八步：暂停/恢复 (Pause)

同一页面 http://localhost:3000/mint-burn

```
1. 点 "Pause Contract" → MetaMask 确认
2. 状态变为 Paused（所有转账/铸造/销毁暂停）
3. 点 "Unpause Contract" → MetaMask 确认
4. 恢复正常
```

---

## 📋 第九步：查看交易日志

路径: http://localhost:3000/transactions

- 所有你之前的操作都会显示在这里
- 用 Tab 标签切换: All / Transfers / Blocked / Mints / Burns

---

## 🐛 完整问题排查表

| 问题                          | 原因                  | 解决                        |
| --------------------------- | ------------------- | ------------------------- |
| **Wrong Network（红色按钮）**     | MetaMask 不在 Sepolia | 点红色按钮 → Switch to Sepolia |
| **刷新后 Wrong Network**       | MetaMask 回到默认网络     | 在 MetaMask 切到 Sepolia，再刷新 |
| **看不到 MetaMask 弹窗**         | 弹窗被浏览器隐藏            | 点浏览器工具栏的🦊图标              |
| **交易失败 insufficient funds** | 没有测试 ETH            | 去水龙头领取（见 2.4）             |
| **Mint/Burn 失败**            | 不是 Owner 操作         | 确认 MetaMask 用的是管理员账户      |
| **数据显示 "—"**                | RPC 请求中             | 等 5-10 秒                  |
| **页面编译慢（15s）**              | Next.js 开发模式首次编译    | 正常现象，第二次秒开                |
| **Connect Wallet 没反应**      | 浏览器阻止弹窗             | 允许弹窗 / 检查 MetaMask 已安装    |

---

## 📝 操作顺序总结（推荐流程）

```
1. yarn start 启动前端
2. MetaMask 切到 Sepolia ← 最重要!!!
3. Connect Wallet → 选 MetaMask → 确认
4. Dashboard 查看数据 ← 验证连接成功
5. Whitelist → 添加一个地址
6. Mint → 铸造 1000 代币
7. Burn → 销毁 500 代币
8. Transactions → 查看所有操作记录
9. (可选) Pause → Unpause 测试暂停功能
```

> 🔑 **核心原则**: 每次操作前确认 MetaMask 在 Sepolia + 管理员账户 + 有测试 ETH
