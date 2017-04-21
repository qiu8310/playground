/**
 * Mordern:         http://www.sitepoint.com/javascript-copy-to-clipboard/
 * Cross Browser:   https://zenorocha.github.io/clipboard.js/
 *
 * Google Search: js copy text
 */
export default function copyElementText(element) {
  let result, selection
  let supportSelectMethod = element.select && element.blur

  if (supportSelectMethod) {
    element.select()
  } else {
    let range = document.createRange()
    range.selectNode(element)
    selection = window.getSelection()
    selection.addRange(range)
  }

  try {
    result = document.execCommand('copy')
  } catch (e) { result = false }

  if (supportSelectMethod) {
    element.blur()
  } else {
    selection.removeAllRanges()
  }

  return result
}

copyElementText.isSupported = document.queryCommandEnabled('copy') || document.queryCommandSupported('copy')
