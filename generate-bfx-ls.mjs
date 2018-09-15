#!/bin/sh
":" //# http://sambal.org/?p=1014 ; exec /usr/bin/env node --experimental-modules "$0" "$@"

import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import pkg from './package.json'
import * as pine from './pine.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

const denominations = [ 'BTC', 'USD' ]

const baseAliasMap = {
  BTC: 'XBT',
  IOT: 'IOTA',
  DSH: 'DASH'
}

const constants = {
  PAIRS_THIS: '*This Pair',
  DENOMINATIONS_BASE: '*in Base'
}

const pairs = fs.readFileSync(`${__dirname}/pairs`, 'utf8')
  .split(EOL)
  .filter(v => v.length)

const parsedPairs = pairs.map(pair => ({ pair, base: pair.slice(0, 3), quote: pair.slice(3) }))

const baseMap = parsedPairs
  .reduce(
    (map, { pair, base, quote }) => {
      map[base] = map[base] || { pairs: [], quotes: [] }
      map[base].pairs.push(pair)
      map[base].quotes.push(quote)
      return map
    },
    {}
  )

const quoteMap = parsedPairs
  .reduce(
    (map, { pair, base, quote }) => {
      map[quote] = map[quote] || { pairs: [], bases: [] }
      map[quote].pairs.push(pair)
      map[quote].bases.push(base)
      return map
    },
    {}
  )

const getDataOfQuoteFunctionMap = Object
  .keys(quoteMap)
  .reduce(
    (acc, quote) => {
      const items = [ 'Longs', 'Shorts' ]
        .map(dataType => ({
          fnName: `get${dataType}Data_quote_${quote}`,
          dataType,
          quote,
          bases: quoteMap[quote].bases
        }))
      return [ ...acc, ...items ]
    },
    []
  )

const supportedTickersMap = parsedPairs
  .reduce(
    (map, parsedPair) => {
      const { pair, base, quote } = parsedPair
      map[pair] = parsedPair
      map[pair + 'LONGS'] = parsedPair
      map[pair + 'SHORTS'] = parsedPair
      if (baseAliasMap[base]) {
        map[baseAliasMap[base] + quote] = parsedPair
      }
      return map
    },
    {}
  )

const pairOptions = [ constants.PAIRS_THIS, ...pairs ]

const denominationOptions = [
  { title: constants.DENOMINATIONS_BASE, value: 'NA' },
  ...denominations.map(denomination => ({ title: `in ${denomination}`, value: denomination}))
].reduce((acc, { title, value }) => Object.assign(acc, { [title]: { title, value } }), {})

const script = `
//@version=3
study("Bitfinex Longs/Shorts {v2} [m59]", shorttitle="BFX L/S", precision=2)

${pine.comment(
`
This script was generated from ${pkg.repository.url}

Issues? ${pkg.bugs}


----- DESCRIPTION

This indicator offers comprehensive views of the Bitfinex margin position data.
See the options for various ways to render this indicator to get the view of this data you're looking for.

* Overlaying the indicator
To overlay the indicator with the main chart,
click the indicator's title with the downward triangle/arrow and select "Move To -> Existing Pane Above".
You may also want to select "Scale -> No Scale".


----- PRINTED VALUES

RENDERED VALUES

Rendered Value 1 | Rendered Value 2 | Zero Line


CUMULATIVE VALUES

Longs (Percent) | Longs (Net) | Longs | Shorts | Open Interest


LOOKBACK DELTA VALUES
The last set of printed values is the differences of the cumulative value of the printed data types from the values a number of bars ago.
See the "Print Delta Lookback Length" option.

Longs (Percent) | Longs (Net) | Longs | Shorts | Open Interest


----- OPTIONS

- Data Type: Select which type of data to render.
  - Buys: A long entering is a buy and a short exiting is a buy.
  - Buys/Sells: Both buys and sells.
  - Longs
  - Longs (Net): Longs subtracted by shorts (longs - shorts).
      It rises when more longs enter than shorts enter and falls when more shorts enter than longs enter,
      so rising means traders are going more long and falling means traders are going more short.
  - Longs (Percent): The percent of long positions of the total positions (longs / (longs + shorts)).
  - Longs/Shorts: Both longs and shorts.
  - Open Interest: The total value of longs and shorts - the total amount of BTC in all margin positions.
  - Shorts
  - Sells: A short entering is a sell and a long exiting is a sell.

  - Data Format:
  - Cumulative: Render the cumulative (running total) of the data.
  - Delta: Render the change from previous cumulative value to current cumulative value of the data.
  - Gain: Render the positive delta only.
  - Loss: Render the negative delta only.

  * A note on Buys and Sells
      The data from which all other values are dervived is the cumulative value of longs and cumulative value of shorts.
      Imagine if all longs and shorts in the market exited, and at the same time, the same amount of longs and shorts entered the market.
      That would be many positions closing and many opening,
      yet this signficant change could not be indicated because the total amount of longs and amount of shorts would remain the same.
      Therefore, Buys and Sells cannot be precise.
      We know if longs are greater than before and/or shorts are less than before, that at least that number of buys occurred and that can be indicated.
      We would not know how many buys and sells occurred as some longs and shorts exited and new longs and shorts entered in their place.

- Pair: The pair for which to get margin data.
  - This Pair: Use the pair of the current chart

- Aggregate Data: Use additional L/S data.
  - Matching Base: Use L/S data that has the same base currency as the currently selected pair i.e. BTCUSD with Matching Base will also include BTCEUR, BTCGBP, and BTCJPY.

- Denomination:
    The denomination by which the data is measured.
    This defaults to the base value.
    For example, if you're viewing the BTCUSD pair, BTC is the base, so by default, the data will be displayed as a measure of BTC.
    If there were 10,000 BTC of long positions, long positions will be represented as 10,000.
    In that case, if you change the denomination to "in USD", and BTCUSD is $6000 USD, long positions would be displayed as 60,000,000 (10,0000 * 6000).

- Print Delta Lookback Length:
    The change of all indicated values from the current bar number back to the "Lookback Length" bar number is calculated and printed.
    I frequently look at two points of the various data presented by this indicator and have to calculate the difference manually.
    With this built-in calculator, you can use the TradingView Measure tool to measure the distance between two points (i.e. "-20 bars")
    and enter that distance (i.e. "20") to see the difference automatically calculated and printed.


---- INTERPRETATION

See the excellent material by Bitcoin Trading Challenge on YouTube: https://www.youtube.com/playlist?list=PLMiIpkr6T9nWbkNzRjcBYVNSC4HmhPSY-


----- SUPPORTED PAIRS

${pairs.join(EOL)}
`
)}


//----- INPUTS

// I use placeholderTicker to prevent unused security calls from crashing the indicator.
placeholderTicker = "BTCUSD"

dataType = input(
   "Longs (Percent)",
   title="Data Source",
   options=[
     "Buys",
     "Buys/Sells",
     "Longs",
     "Longs (Net)",
     "Longs (Percent)",
     "Longs/Shorts",
     "Open Interest",
     "Sells",
     "Shorts"])

DATA_TYPE_BUYS = "Buys"
DATA_TYPE_BUYS_SELLS = "Buys/Sells"
DATA_TYPE_LONGS = "Longs"
DATA_TYPE_LONGS_NET = "Longs (Net)"
DATA_TYPE_LONGS_PERCENT = "Longs (Percent)"
DATA_TYPE_LONGS_SHORTS = "Longs/Shorts"
DATA_TYPE_OPEN_INTEREST = "Open Interest"
DATA_TYPE_SELLS = "Sells"
DATA_TYPE_SHORTS = "Shorts"

dataFormat = input("Cumulative", title="Data Format", options=[ "Cumulative", "Delta", "Gain", "Loss" ])

DATA_FORMAT_CUMULATIVE = "Cumulative"
DATA_FORMAT_DELTA = "Delta"
DATA_FORMAT_GAIN = "Gain"
DATA_FORMAT_LOSS = "Loss"

pairSelected = input(
   "${pairOptions[0]}",
   title="Pair",
   options=${pine.list(pairOptions)})

aggregateData = input(
   "*",
   title="Aggregate Data",
   options=[ "*", "Matching Base" ])

denominationSelected = input(
   "${constants.DENOMINATIONS_BASE}",
   title="Denomination",
   options=${pine.list(Object.values(denominationOptions).map(option => option.title))})

printDeltaLookbackLength = input(1, title="Print Delta Lookback Length")


//----- HELPERS

gain (value) => max(change(value), 0)

loss (value) => abs(min(change(value), 0))

chooseDataByFormat (format, cumulative, delta, gain, loss) =>
   (format == DATA_FORMAT_CUMULATIVE
     ? cumulative
     : (format == DATA_FORMAT_DELTA
       ? delta
       : (format == DATA_FORMAT_GAIN
         ? gain
         : (format == DATA_FORMAT_LOSS
           ? loss
           : na))))

getBase (pair) => ${pine.lookup('pair', supportedTickersMap, ticker => pine.string(ticker.base), pine.string('NA'))}

getBfxClose (tkr) => security(tickerid("BITFINEX", tkr), period, close)

getLongsData (pair) => getBfxClose(pair + "LONGS")
getShortsData (pair) => getBfxClose(pair + "SHORTS")

// Generate a function for each quote currency, which will return 0 if called with a base the quote does not support.
// This gives me a sane starting point to ensure there are not too many calls to security in the script. The limit is 40.
${getDataOfQuoteFunctionMap
  .map(({ fnName, dataType, quote, bases }) => {
    // generates a pine expression that will be true if the pine variable `base` has a value that is in the js `bases` array
    // if the expression is true, that means we should get data for this base using this quote function
    const supportedBaseCondition = pine.includes('base', bases.map(pine.string))
    // if the pine expression is true, use the base + quote as the pair argument, otherwise use the placeholder
    const pairArgument = `${supportedBaseCondition} ? base + ${pine.string(quote)} : placeholderTicker`
    // if the pine expression is true, get the data for this pair, or return 0
    // if the data is `na`, return 0 so that the result can be aggregated with the rest of the data
    return `${fnName} (base) => ${supportedBaseCondition} ? nz(get${dataType}Data(${pairArgument}), 0) : 0`
  })
  .join(EOL)
}

getAggregatedLongsDataMatchingBase (base) => ${getDataOfQuoteFunctionMap
  .filter(({ dataType }) => dataType == 'Longs')
  .map(({ fnName }) => `${fnName}(base)`)
  .join(' + ')
}

getAggregatedShortsDataMatchingBase (base) => ${getDataOfQuoteFunctionMap
  .filter(({ dataType }) => dataType == 'Shorts')
  .map(({ fnName }) => `${fnName}(base)`)
  .join(' + ')
}

//----- VALUES

aggregateMatchingBase = aggregateData == "Matching Base"
pairSource = pairSelected == "${constants.PAIRS_THIS}" ? ticker : pairSelected
pair = ${pine.lookup('pairSource', supportedTickersMap, ticker => pine.string(ticker.pair), pine.string('NA'))}
base = getBase(pair)

${pine.comment(
`
The denominating logic is awkward because the security function is busted and won't work with a value that uses ticker in certain ways, such as the following:

t = ticker
t2 = t
x =  security(true ? t : (t + t2), period, close)
plot(x)

The workaround is to put the offending logic into a function and derive the argument for security from that function.
Also, pine seems determined to evaluate and execute the security function, even if I only conditionally call it and the condition is not met.
`
)}

denomination = ${pine.lookup('denominationSelected', denominationOptions, option => pine.string(option.value), pine.string('NA'))}
getDenominationTicker (targetDenomination, currentDenomination) =>
    denominationTicker = currentDenomination + targetDenomination
    targetDenomination == "NA" ? placeholderTicker : denominationTicker
denominationModifier = getBfxClose(getDenominationTicker(denomination, base))
denominate (value) => denomination == "NA" ? value : (value * denominationModifier)

longs_cumulative = aggregateMatchingBase ? getAggregatedLongsDataMatchingBase(base) : getLongsData(pair)
shorts_cumulative = aggregateMatchingBase ? getAggregatedShortsDataMatchingBase(base) : getShortsData(pair)

openInterest_cumulative = longs_cumulative + shorts_cumulative
longs_net_cumulative = longs_cumulative - shorts_cumulative
longs_percent_cumulative = (longs_cumulative / openInterest_cumulative) * 100

longs_delta = change(longs_cumulative)
longs_net_delta = change(longs_net_cumulative)
longs_percent_delta = change(longs_percent_cumulative)
openInterest_delta = change(openInterest_cumulative)
shorts_delta = change(shorts_cumulative)

longs_gain = gain(longs_cumulative)
longs_net_gain = gain(longs_net_cumulative)
longs_percent_gain = gain(longs_percent_cumulative)
openInterest_gain = gain(openInterest_cumulative)
shorts_gain = gain(shorts_cumulative)

longs_loss = loss(longs_cumulative)
longs_net_loss = loss(longs_net_cumulative)
longs_percent_loss = loss(longs_percent_cumulative)
openInterest_loss = loss(openInterest_cumulative)
shorts_loss = loss(shorts_cumulative)

buys_gain = longs_gain + shorts_loss
sells_gain = shorts_gain + longs_loss

buys_loss = na
sells_loss = na

buys_delta = buys_gain
sells_delta = sells_gain

buys_cumulative = cum(buys_delta)
sells_cumulative = cum(sells_delta)

longsPrintDelta = change(longs_cumulative, printDeltaLookbackLength)
longsNetPrintDelta = change(longs_net_cumulative, printDeltaLookbackLength)
longsPercentPrintDelta = change(longs_percent_cumulative, printDeltaLookbackLength)
shortsPrintDelta = change(shorts_cumulative, printDeltaLookbackLength)
openInterestPrintDelta = change(openInterest_cumulative, printDeltaLookbackLength)
buysPrintDelta = change(buys_cumulative, printDeltaLookbackLength)
sellsPrintDelta = change(sells_cumulative, printDeltaLookbackLength)


//----- RENDER

renderBuys = (dataType == DATA_TYPE_BUYS) or (dataType == DATA_TYPE_BUYS_SELLS)
renderLongs = (dataType == DATA_TYPE_LONGS) or (dataType == DATA_TYPE_LONGS_SHORTS)
renderLongsNet = dataType == DATA_TYPE_LONGS_NET
renderLongsPercent = dataType == DATA_TYPE_LONGS_PERCENT
renderOpenInterest = dataType == DATA_TYPE_OPEN_INTEREST
renderSells = (dataType == DATA_TYPE_SELLS) or (dataType == DATA_TYPE_BUYS_SELLS)
renderShorts = (dataType == DATA_TYPE_SHORTS) or (dataType == DATA_TYPE_LONGS_SHORTS)

longsPercentRenderValue = chooseDataByFormat(dataFormat, longs_percent_cumulative, longs_percent_delta, longs_percent_gain, -longs_percent_loss)
longsNetRenderValue = denominate(chooseDataByFormat(dataFormat, longs_net_cumulative, longs_net_delta, longs_net_gain, -longs_net_loss))
longsRenderValue = denominate(chooseDataByFormat(dataFormat, longs_cumulative, longs_delta, longs_gain, -longs_loss))
shortsRenderValue = denominate(chooseDataByFormat(dataFormat, shorts_cumulative, shorts_delta, shorts_gain, -shorts_loss))
openInterestRenderValue = denominate(chooseDataByFormat(dataFormat, openInterest_cumulative, openInterest_delta, openInterest_gain, -openInterest_loss))
buysRenderValue = denominate(chooseDataByFormat(dataFormat, buys_cumulative, buys_delta, buys_gain, -buys_loss))
sellsRenderValue = denominate(chooseDataByFormat(dataFormat, sells_cumulative, sells_delta, sells_gain, -sells_loss))

renderValue1 = renderBuys
   ? buysRenderValue
   : (renderLongs
     ? longsRenderValue
     : (renderLongsNet
       ? longsNetRenderValue
       : (renderLongsPercent
         ? longsPercentRenderValue
         : (renderOpenInterest
           ? openInterestRenderValue
           : na))))

renderValue2 = renderSells
   ? sellsRenderValue
   : (renderShorts
     ? shortsRenderValue
     : na)

longsColor = #53B987
shortsColor = #EB4D5C
openInterestColor = #247BA0

renderColor1 = (renderBuys or renderLongs or renderLongsNet or renderLongsPercent)
   ? longsColor
   : (renderOpenInterest
     ? openInterestColor
     : na)

renderColor2 = shortsColor

renderZeroLine = (dataFormat == DATA_FORMAT_DELTA)

plot(renderValue1, title="Rendered Value 1", color=renderColor1)
plot(renderValue2, title="Rendered Value 2", color=renderColor2)
plot(renderZeroLine ? 0 : na, title="Zero Line", style=circles, color=renderZeroLine ? color(black, 50) : white)

plotshape(longs_percent_cumulative, title="Longs (Percent) {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(longs_net_cumulative), title="Longs (Net) {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(longs_cumulative), title="Longs {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(shorts_cumulative), title="Shorts {Print}", location=location.top, color=shortsColor, transp=100)
plotshape(denominate(openInterest_cumulative), title="Open Interest {Print}", location=location.top, color=openInterestColor, transp=100)

plotshape(0, title="Divider {Print}", location=location.top, color=white, transp=100)

plotshape(longsPercentPrintDelta, title="Longs (Percent) Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(longsNetPrintDelta), title="Longs (Net) Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(longsPrintDelta), title="Longs Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(denominate(shortsPrintDelta), title="Shorts Lookback Delta {Print}", location=location.top, color=shortsColor, transp=100)
plotshape(denominate(openInterestPrintDelta), title="Open Interest Lookback Delta {Print}", location=location.top, color=openInterestColor, transp=100)
`

process.stdout.write(script)
