# VPorkPay — Checkpoint 3 Submission

Use the following values in the Checkpoint 3 form. The order below matches the form exactly.

## 1. Submission Details

VPorkPay is a functional Arc Testnet MVP for everyday pork procurement with direct USDC settlement and merchant-approved onchain store credit. We built a responsive marketplace, wallet-owned carts and orders, Supabase persistence with Web3 authentication and Row Level Security, seller-only fulfilment and credit operations, a two-way Circle App Kit CCTP bridge between Ethereum Sepolia and Arc Testnet, and a policy-bounded Circle Agent Stack payment runner. At checkout, a funded buyer pays the merchant directly in test USDC. If the balance is insufficient, only the exact shortfall becomes a credit request; no debt exists until the shop owner signs `openDebt` on Arc. The source-verified VPorkPayStoreCredit v1.1 contract fixes APR from the pork-price index, accrues simple interest using block time, enforces a buyer-approved repayment cap and transfers repayment directly to the immutable merchant. The public repository includes the complete frontend, Solidity source, reproducible artifacts, automated lifecycle tests, implementation notes and user documentation. The product, video, deck, code and verified Arcscan evidence are all publicly accessible without placeholders. Arc Testnet only; the contract is an unaudited hackathon prototype.

## 2. Link to Code

https://github.com/vybao39-rgb/porkpay

## 3. Link to Demo Video

https://vpork.xyz/VPorkPay-Final-Demo.mp4

The published video is exactly 180 seconds, Full HD, with English narration and English subtitles.

## 4. Link to Presentation

https://vpork.xyz/presentation.html#slide-1

Editable PowerPoint backup:

https://vpork.xyz/VPorkPay-Final-Submission-Deck.pptx

## 5. Live Demo Link

https://vpork.xyz/

## 6. Tell us about your team

This field is optional in the displayed form. Leave it empty unless a separate personal or team-introduction video has been recorded. Do not reuse the product demo because this field asks for the team's background and motivation.

## Supporting evidence

- Final submission hub: https://vpork.xyz/submission.html
- Verified Arc Testnet contract: https://testnet.arcscan.app/address/0xd9dab755431664ada2d13868674ddb43ffdef396?tab=contract
- Deployment transaction: https://testnet.arcscan.app/tx/0x07acbc8ad1f7a2a2ef0dddafd457b93de30a08d4dc33d6881452cc16049a0067
- Vietnamese user guide: https://vpork.xyz/VPorkPay-User-Guide-VI.pdf

## Final pre-submit check

- Code repository is public.
- Demo video opens without sign-in and is exactly three minutes.
- Interactive presentation opens in the browser; the editable PowerPoint is also public.
- Live MVP opens at the root domain without a hash route.
- No required field contains a placeholder.
- The separate team-introduction field is intentionally blank unless a real team video is available.
