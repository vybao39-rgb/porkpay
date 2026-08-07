// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title VPorkPay Store Credit
/// @notice Records merchant-approved trade credit and settles full repayment in USDC.
/// @dev Arc Testnet prototype. This contract has not been independently audited.
contract VPorkPayStoreCredit {
    bytes32 public constant CONTRACT_ID = keccak256("VPorkPayStoreCredit:v1.1");
    uint256 public constant YEAR = 365 days;
    uint256 public constant MAX_PRINCIPAL = 1_000_000e6;
    uint16 public constant BASE_APR_BPS = 800;
    uint16 public constant MIN_APR_BPS = 600;
    uint16 public constant MAX_APR_BPS = 1_800;

    IERC20 public immutable usdc;
    address public immutable merchant;
    int16 public porkPriceChangeBps;

    uint256 private _lock = 1;

    struct Debt {
        address buyer;
        uint128 principal;
        uint128 repaid;
        uint64 openedAt;
        uint16 aprBps;
        bool closed;
    }

    mapping(bytes32 orderId => Debt) public debts;

    error OnlyMerchant();
    error InvalidAddress();
    error InvalidPrincipal();
    error InvalidPriceChange();
    error DebtAlreadyExists();
    error DebtNotActive();
    error OnlyBuyer();
    error AmountDueExceedsMaximum(uint256 amountDue, uint256 maximumApproved);
    error TransferFailed();
    error ReentrantCall();

    event PorkPriceChangeUpdated(int16 previousBps, int16 newBps);
    event DebtOpened(bytes32 indexed orderId, address indexed buyer, uint256 principal, uint16 aprBps);
    event DebtRepaid(bytes32 indexed orderId, address indexed buyer, address indexed merchant, uint256 amount);
    event DebtCancelled(bytes32 indexed orderId);

    modifier onlyMerchant() {
        if (msg.sender != merchant) revert OnlyMerchant();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert ReentrantCall();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address usdcAddress, int16 initialPorkPriceChangeBps) {
        if (usdcAddress == address(0)) revert InvalidAddress();
        if (initialPorkPriceChangeBps < -4_000 || initialPorkPriceChangeBps > 4_000) {
            revert InvalidPriceChange();
        }
        usdc = IERC20(usdcAddress);
        merchant = msg.sender;
        porkPriceChangeBps = initialPorkPriceChangeBps;
    }

    function aprForPriceChange(int16 priceChangeBps) public pure returns (uint16) {
        int256 calculated = int256(uint256(BASE_APR_BPS)) + int256(priceChangeBps) / 2;
        if (calculated < int256(uint256(MIN_APR_BPS))) return MIN_APR_BPS;
        if (calculated > int256(uint256(MAX_APR_BPS))) return MAX_APR_BPS;
        return uint16(uint256(calculated));
    }

    function setPorkPriceChangeBps(int16 newPriceChangeBps) external onlyMerchant {
        if (newPriceChangeBps < -4_000 || newPriceChangeBps > 4_000) revert InvalidPriceChange();
        int16 previous = porkPriceChangeBps;
        porkPriceChangeBps = newPriceChangeBps;
        emit PorkPriceChangeUpdated(previous, newPriceChangeBps);
    }

    function openDebt(bytes32 orderId, address buyer, uint128 principal) external onlyMerchant {
        if (buyer == address(0) || buyer == merchant) revert InvalidAddress();
        if (principal == 0 || principal > MAX_PRINCIPAL) revert InvalidPrincipal();
        if (debts[orderId].buyer != address(0)) revert DebtAlreadyExists();

        uint16 aprBps = aprForPriceChange(porkPriceChangeBps);
        debts[orderId] = Debt({
            buyer: buyer,
            principal: principal,
            repaid: 0,
            openedAt: uint64(block.timestamp),
            aprBps: aprBps,
            closed: false
        });

        emit DebtOpened(orderId, buyer, principal, aprBps);
    }

    function interestAccrued(bytes32 orderId) public view returns (uint256) {
        Debt memory debt = debts[orderId];
        if (debt.buyer == address(0)) return 0;
        uint256 elapsed = block.timestamp - uint256(debt.openedAt);
        return uint256(debt.principal) * uint256(debt.aprBps) * elapsed / (10_000 * YEAR);
    }

    function amountDue(bytes32 orderId) public view returns (uint256) {
        Debt memory debt = debts[orderId];
        if (debt.buyer == address(0) || debt.closed) return 0;
        return uint256(debt.principal) + interestAccrued(orderId) - uint256(debt.repaid);
    }

    /// @notice Repays the current debt while protecting the buyer from an unexpectedly larger charge.
    /// @param maxAmount The maximum USDC amount the buyer authorized for this repayment.
    function repayInFull(bytes32 orderId, uint256 maxAmount) external nonReentrant returns (uint256 paid) {
        Debt storage debt = debts[orderId];
        if (debt.buyer == address(0) || debt.closed) revert DebtNotActive();
        if (msg.sender != debt.buyer) revert OnlyBuyer();

        paid = amountDue(orderId);
        if (paid > maxAmount) revert AmountDueExceedsMaximum(paid, maxAmount);
        debt.repaid += uint128(paid);
        debt.closed = true;

        if (!usdc.transferFrom(msg.sender, merchant, paid)) revert TransferFailed();
        emit DebtRepaid(orderId, msg.sender, merchant, paid);
    }

    function cancelDebt(bytes32 orderId) external onlyMerchant {
        Debt storage debt = debts[orderId];
        if (debt.buyer == address(0) || debt.closed) revert DebtNotActive();
        debt.closed = true;
        emit DebtCancelled(orderId);
    }

}
