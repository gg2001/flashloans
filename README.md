# Flash loan examples

![CI](https://github.com/gg2001/flashloans/workflows/CI/badge.svg)

Implementations of Aave, dYdX and Uniswap (coming soon) flash loans.

## Tests

### Aave

```
WETH 291618.07178644277661004 (fee: 262.456264607798498949)
USDC 44717206.41467 (fee: 40245.485773)
DAI 21602903.717869620560047272 (fee: 19442.613346082658504042)
```

### dYdX

```
WETH 120695.19440535901869926 (fee: 0.000000000000000002)
USDC 14646088.247365 (fee: 0.000000000000000002)
DAI 8115907.878251847787692695 (fee: 0.000000000000000002)
```

### Gas usage

```
···························|···························|·············|·····························
|  Methods                 ·              100 gwei/gas               ·      1715.20 usd/eth       │
·············|·············|·············|·············|·············|··············|··············
|  Contract  ·  Method     ·  Min        ·  Max        ·  Avg        ·  # calls     ·  usd (avg)  │
·············|·············|·············|·············|·············|··············|··············
|  Aave      ·  flashLoan  ·     189567  ·     209402  ·     196542  ·           3  ·      33.71  │
·············|·············|·············|·············|·············|··············|··············
|  DYDX      ·  flashLoan  ·     208182  ·     223423  ·     214269  ·           3  ·      36.75  │
·············|·············|·············|·············|·············|··············|··············
|  Deployments             ·                                         ·  % of limit  ·             │
···························|·············|·············|·············|··············|··············
|  Aave                    ·          -  ·          -  ·     508188  ·       5.3 %  ·      87.16  │
···························|·············|·············|·············|··············|··············
|  DYDX                    ·          -  ·          -  ·     787076  ·       8.3 %  ·     135.00  │
·--------------------------|-------------|-------------|-------------|--------------|-------------·
```
