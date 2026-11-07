# Design QA

Source visual truth: ../source-menu.png (the supplied merchant menu, 661 x 984 pixels).
Implementation: ../../outputs/live-preview.png (the published Railway page, 661 x 984 pixels).
Comparison: ../qa-comparison.png, 1322 x 984; source left, implementation right, both at original pixel dimensions without scaling. State: menu ready, no active group orders. Native screenshots represent the same CSS-sized browser viewport. A separate 390px iframe capture and the earlier 1280px local desktop capture were also reviewed.

This is an intentional group-ordering adaptation: the user requested active titles and prices, selectable items and per-person collection. It is not a visual clone of merchant checkout. The source includes its address-selection and promotional sections; these are intentionally replaced by the group-ordering introduction, search, categories, basket and group tab.

## Findings
No actionable P0/P1/P2 issues within the requested scope were found in the combined visual comparison.

- Fonts and typography: Persian RTL text renders correctly with Vazirmatn and Tahoma fallback. Product names wrap without truncation. Prices are readable and consistently formatted in Persian digits; source product labels and volumes remain intact.
- Spacing and layout rhythm: responsive two-column product cards and persistent mobile basket control fit the viewport. The mobile basket was opened, filled and submitted on the public page. Earlier desktop basket layout was verified locally.
- Colors and tokens: consistent muted white background, dark readable text, and pink action color; selected categories and primary actions are distinguishable.
- Image quality and assets: no substitute or approximated merchant photographs are used. The explicit title/price-only request permits omission of source product photos. No decorative SVG or invented image asset was added.
- Copy and content: 175 active products in 11 categories, five discounts, toman units, per-person fields, shared totals and source date are present. Merchant medical descriptions were not copied. Page copy distinguishes collecting an order from purchasing at the merchant.

## Interaction and runtime evidence
Public browser: item selection, mobile basket, name and note entry, submission, shared total, cancellation and final empty list passed. The test order survived a real Railway redeployment. Public browser console errors: none. Node API and hosting tests: eight passed. Railway Function adapter check passed. Local CSV, editing and reload evidence is in verification.md.

A supplementary attempt to compare the live HTML hash through Node failed at the external TLS connection; no hash-match claim is made. Browser-rendered production evidence and independent fresh API verification after redeployment are available.

## Comparison history
One final visual comparison; no visual fixes were needed during this pass. Layout differences from the merchant source are intentional and documented above.

## Follow-up polish
None required for the requested scope. Availability beyond the current Railway account credit/plan is an operational dependency, not a visual issue.

final result: passed

## Bounded order-management update
Source: ../management-before.png; new management view: ../../outputs/order-management.png. Existing palette, typography and layout were retained. The third navigation entry, owned-order controls and deletion dialog are intentional additions requested by the user. New management screenshots and the live browser flow were reviewed; edit/delete controls are visible and the existing menu remains intact. Local browser console errors: none. My Orders is empty in a separate browser context until its private management link is opened.
final result: passed
