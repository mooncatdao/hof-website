# MoonCat Hall of Fame Website

Status: Not started

# Introduction

## Purpose

To provide a decentralized way to update, generate and display the Hall of Fame. 

## Problem statement

The Hall of Fame graphic is currently being edited by vidpet manually by request.

## Target audience

Hall of Fame holders, general MoonCat community, general public.

# Objectives

## Goals

Promotes MoonCats in general, collectors, and premium MoonCats.

## Non-goals

*List objectives that will not be addressed by this product requirements document*

# Metrics

* Admins and holders can update the cards.  
* Anyone can save a copy of the current Hall of Fame.  
* Is a cool MoonCat tool.

# Requirements

## Functional requirements

*Indicate importance levels (Example: P0 \= Must-have, P1 \= Should-have, and P2 \= Nice-to-have) and outline what the product or feature must do*

| Priority | Detailed description |
| :---- | :---- |
| P0 | Replication of the Hall of Fame on a website |
| P0 | Admins can edit the Hall of Fame data |
| P1 | Holders can sign in and edit/add their data |
| P1 | Responsive design for desktop and mobile |
| P1 | The Hall of Fame graphic can be saved |
| P1 | Let holders of multiple eligible cats pick the one they want on display |
| P1 | Holders are able to tie multiple wallets to one sign in |
| P2 | Allow to switch between MoonCat/accessorized view (similar as on chainstation) |
| P2 | Different themes |
| P2 | Adjust the width/height of the card grid |
| P2 | Wallet holdings can be checked periodically for changes |

## Non-functional requirements

### Performance

* Should be fairly simple and pages optimized

### Security

* Ideally should allow holders to sign in and verify assets with as little friction as possible, with options for holders unwilling to connect/sign directly.  
* Only read access to wallets.  
* Database protected from unauthorized access.  
* Some way to check wallet holdings periodically.

### Usability

* Instructions clearly stated.  
* Images with Alt text.  
* Clear indication if signed in.  
* Ability to revert to a default view.  
* Confirmations of actions.

### Compatibility

* Most major browsers.  
* Desktop, mobile and medium screens.  
* Standard sign-in with as many wallets as possible.

## Dependencies

### Internal

* Possibly MoonCat API data.

### External

* Maybe some standard sign in with Ethereum code, or sign in with Vulcan.

## Assumptions

*List the key assumptions that might change the business equation*

* 

## Risks and mitigations

* Sign in hesitancy  
  * Provide backup method(s)  
* Malicious admin or admin mistake  
  * Limit admins, limit powers  
* Database loss  
  * Some kind of automatic backup

# Timeline and milestones

| Milestone | Details | ETA |
| :---- | :---- | :---- |
| M1 | Add key feature deliverables | Date |
| M2 | Add key feature deliverables | Date |
| M3 | Add key feature deliverables | Date |
| M4 | Add key feature deliverables | Date |
| M5 | Add key feature deliverables | Date |

# Questions and resources

## Open questions

| Questions | Status |
| :---- | :---- |
| Will it be hosted as part of the DAO website? | Open |
| Will it be a bounty or in-house project? | Open |
| What frameworks to use ([next.js](http://next.js), css or tailwind, web3 tooling) | Open |
| Should it be open source and/or hosted on github? | Open |
| Currently the Hall of Fame is Day 1 cats (including genesis), should it be expanded or split to also include other genesis or character cats (was hinted at in the original proposal) | Open |
| Should the Hall of Fame be limited to a certain number of cards (or should there be an option to limit the display of only the first x number) | Open |

## Additional resources

Midnight’s plans to verify on chainstation:

What I'm planning for ChainStation [https://gitlab.com/mooncatrescue/chainstation-web/-/issues/75](https://gitlab.com/mooncatrescue/chainstation-web/-/issues/75) is using Delegate for on-chain verification and EAS for looser verification. Having it be an EAS signature rather than "a transaction to themselves" gives some "future-proofing" where then the signed Attestation could be verified by a smart contract and not just an off-chain web app.

File

File

File