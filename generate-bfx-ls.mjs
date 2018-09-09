#!/bin/sh
":" //# http://sambal.org/?p=1014 ; exec /usr/bin/env node --experimental-modules "$0" "$@"

import got from 'got'
import jsdom from 'jsdom'
import pkg from './package.json'
import * as pine from './pine.mjs'

const { JSDOM } = jsdom

const Script = ({ constants, allPairs, tickers, baseOptions, quoteOptions, denominationOptions }) => `
//@version=3
study("Bitfinex Longs/Shorts {v2} [m59]", shorttitle="BFX L/S", precision=2)

${pine.comment(
`
This script was generated from ${pkg.repository.url}

Issues? ${pkg.bugs}


----- DESCRIPTION

This indicator offers comprehensive views of the Bitfinex margin position data.
See the options for various ways to render this indicator to get the view of this data you're looking for.
You may also want to click the indicator's title with the downward triangle/arrow
and select "Move To -> Existing Pane Above" to overlay the indicator with the price.

* A note on "resolve_error". READ THIS!
"resolve_error" is normal and expected, depending on how you're using the indicator.
By default, the indicator will try to find data by using the base and quote (pair) of the chart you are on.
You can change the data in the indicator settings by choosing a different base and/or quote.
You can change the denomination of the displayed data as well.
Not all bases, quotes, and denominations are compatible.
If you get "resolve_error",
you're either on an unsupported chart using the default settings
or you've manually selected an incompatible configuration of base/quote/denomination.


----- PRINTED VALUES

RENDERED VALUES

Rendered Value 1 | Rendered Value 2 | Zero Line


CUMULATIVE VALUES

Longs | Longs (Net) | Longs (Percent) | Shorts | Open Interest


LOOKBACK DELTA VALUES
The last set of printed values is the differences of the cumulative value of the printed data types from the values a number of bars ago.
See the "Print Delta Lookback Length" option.

Longs | Longs (Net) | Longs (Percent) | Shorts | Open Interest


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

- Base: The base of the pair (BTC is the base of the BTCUSD pair).
  - This Base: use the base of the current chart

- Quote: The quote of the pair (USD is the base of the BTCUSD pair).
  - This Quote: use the quote of the current chart

- Denomination:
    The denomination by which the data is measured.
    This defaults to the base value.
    For example, if you're viewing the BTCUSD pair, BTC is the base, so by default, the data will be displayed as a measure of BTC.
    If there were 10,000 BTC of long positions, long positions will be represented as 10,000.
    In that case, if you change the denomination to "USD", and BTCUSD is $6000 USD, long positions would be displayed as 60,000,000 (10,0000 * 6000).
  - Base: Use the selected base value (default)
  - Quote: Use the selected quote value

- Print Delta Lookback Length:
    The change of all indicated values from the current bar number back to the "Lookback Length" bar number is calculated and printed.
    I frequently look at two points of the various data presented by this indicator and have to calculate the difference manually.
    With this built-in calculator, you can use the TradingView Measure tool to measure the distance between two points (i.e. "-20 bars")
    and enter that distance (i.e. "20") to see the difference automatically calculated and printed.


---- INTERPRETATION

See the excellent material by Bitcoin Trading Challenge on YouTube: https://www.youtube.com/playlist?list=PLMiIpkr6T9nWbkNzRjcBYVNSC4HmhPSY-
`
)}


//----- INPUTS

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

baseSelected = input(
   "${constants.BASES_THIS}",
   title="Base",
   options=${pine.list(baseOptions)})

quoteSelected = input(
   "${constants.QUOTES_THIS}",
   title="Quote",
   options=${pine.list(quoteOptions)})

denominationSelected = input(
   "${constants.DENOMINATIONS_BASE}",
   title="Denomination",
   options=${pine.list(denominationOptions)})

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

getClose (ticker) => security(ticker, period, close)

getMarginData (base, quote) =>
    pair = base + quote
    [ getClose(pair + "LONGS"), getClose(pair + "SHORTS") ]

getBase (tkr) => ${pine.lookup('tkr', tickers, ticker => pine.string(ticker.base), pine.string('NA'))}

getQuote (tkr) => ${pine.lookup('tkr', tickers, ticker => pine.string(ticker.quote), pine.string('NA'))}

${pine.comment(
`
The denominating logic is awkward because the security function is busted and won't work with a value that uses ticker in certain ways, such as the following:

t = ticker
t2 = t
x =  security(true ? t : (t + t2), period, close)
plot(x)

The workaround is to put the offending logic into a function and derive the argument for security from that function.
`
)}

getDenominationTicker (base, quote) =>
    denomination = denominationSelected == "${constants.DENOMINATIONS_BASE}" ? base :
       denominationSelected == "${constants.DENOMINATIONS_QUOTE}" ? quote :
       denominationSelected
    denomination == base ? "NA" : "BITFINEX:" + base + denomination

denominate (base, quote, value) =>
    denominationTicker = getDenominationTicker(base, quote)
    denominationTicker == "NA" ? value : (value * getClose(denominationTicker))


//----- VALUES

base = baseSelected == "${constants.BASES_THIS}" ? getBase(ticker) : baseSelected

quote = quoteSelected == "${constants.QUOTES_THIS}" ? getQuote(ticker) : quoteSelected

[ longs_cumulative_base, shorts_cumulative_base ] = getMarginData(base, quote)

longs_cumulative = denominate(base, quote, longs_cumulative_base)
shorts_cumulative = denominate(base, quote, shorts_cumulative_base)

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

buysRenderValue = chooseDataByFormat(dataFormat, buys_cumulative, buys_delta, buys_gain, -buys_loss)
longsRenderValue = chooseDataByFormat(dataFormat, longs_cumulative, longs_delta, longs_gain, -longs_loss)
longsNetRenderValue = chooseDataByFormat(dataFormat, longs_net_cumulative, longs_net_delta, longs_net_gain, -longs_net_loss)
longsPercentRenderValue = chooseDataByFormat(dataFormat, longs_percent_cumulative, longs_percent_delta, longs_percent_gain, -longs_percent_loss)
openInterestRenderValue = chooseDataByFormat(dataFormat, openInterest_cumulative, openInterest_delta, openInterest_gain, -openInterest_loss)
sellsRenderValue = chooseDataByFormat(dataFormat, sells_cumulative, sells_delta, sells_gain, -sells_loss)
shortsRenderValue = chooseDataByFormat(dataFormat, shorts_cumulative, shorts_delta, shorts_gain, -shorts_loss)

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

plotshape(longs_cumulative, title="Longs {Print}", location=location.top, color=longsColor, transp=100)
plotshape(longs_net_cumulative, title="Longs (Net) {Print}", location=location.top, color=longsColor, transp=100)
plotshape(longs_percent_cumulative, title="Longs (Percent) {Print}", location=location.top, color=longsColor, transp=100)
plotshape(shorts_cumulative, title="Shorts {Print}", location=location.top, color=shortsColor, transp=100)
plotshape(openInterest_cumulative, title="Open Interest {Print}", location=location.top, color=openInterestColor, transp=100)

plotshape(0, title="Divider {Print}", location=location.top, color=white, transp=100)

plotshape(longsPrintDelta, title="Longs Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(longsNetPrintDelta, title="Longs (Net) Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(longsPercentPrintDelta, title="Longs (Percent) Lookback Delta {Print}", location=location.top, color=longsColor, transp=100)
plotshape(shortsPrintDelta, title="Shorts Lookback Delta {Print}", location=location.top, color=shortsColor, transp=100)
plotshape(openInterestPrintDelta, title="Open Interest Lookback Delta {Print}", location=location.top, color=openInterestColor, transp=100)
`

got('https://www.bitfinex.com/stats#pairs')
  .then(({ body }) => {
    const { window } = new JSDOM(body)
    const pairs = [ ...window.document.querySelectorAll('#pairs + table .col-info') ]
      .map(v => v.textContent.split('/'))
      .reduce(
        ({ allPairs, tickers, bases, quotes }, [ base, quote ]) => {
          const ticker = `${base}${quote}`
          tickers[ticker] = { base, quote }
          bases[base] = bases[base] || []
          quotes[quote] = quotes[quote] || []
          bases[base].push(quote)
          quotes[quote].push(base)
          allPairs.push(`${base}${quote}`)
          return { tickers, bases, quotes, allPairs }
        },
        { tickers: { XBTUSD: { base: 'BTC', quote: 'USD' } }, bases: {}, quotes: {}, allPairs: [] }
      )
    const allPairs = pairs.allPairs.sort()
    const bases = Object.keys(pairs.bases).sort()
    const quotes = Object.keys(pairs.quotes).sort()
    const constants = {
      BASES_THIS: '*This Base',
      BASES_ALL: '*All Bases',
      QUOTES_THIS: '*This Quote',
      QUOTES_ALL: '*All Quotes',
      DENOMINATIONS_BASE: '*Base',
      DENOMINATIONS_QUOTE: '*Quote'
    }
    const baseOptions = [ constants.BASES_THIS, ...bases ]
    const quoteOptions = [ constants.QUOTES_THIS, ...quotes ]
    const nonDenominationalQuotes = [ 'EOS' ]
    const denominations = quotes.filter(quote => !(nonDenominationalQuotes.includes(quote)))
    const denominationOptions = [ constants.DENOMINATIONS_BASE, constants.DENOMINATIONS_QUOTE, ...denominations ]
    const script = Script({ constants, allPairs, tickers: pairs.tickers, baseOptions, quoteOptions, denominationOptions })
    process.stdout.write(script)
  })
