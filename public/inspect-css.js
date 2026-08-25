;(function () {
  if (location.protocol === 'chrome-extension:') {
    return {
      stylesheetCount: 0,
      styleRules: 0,
      cssBytes: 0,
      loadTimeMs: null,
      blockedHrefs: [],
      sizedHrefs: [],
    }
  }

  function utf8Length(text) {
    try {
      return new TextEncoder().encode(text).length
    } catch {
      return unescape(encodeURIComponent(text)).length
    }
  }

  var sheets = document.styleSheets
  var stylesheetCount = sheets.length
  var styleRules = 0
  var cssBytes = 0
  var blockedHrefs = []
  var hrefs = []

  for (var s = 0; s < sheets.length; s += 1) {
    var sheet = sheets[s]
    if (!sheet) continue
    if (sheet.href && hrefs.indexOf(sheet.href) === -1) hrefs.push(sheet.href)
    try {
      styleRules += sheet.cssRules.length
      if (!sheet.href) {
        var inlineText = ''
        for (var r = 0; r < sheet.cssRules.length; r += 1) {
          if (sheet.cssRules[r]) inlineText += sheet.cssRules[r].cssText
        }
        cssBytes += utf8Length(inlineText)
      }
    } catch {
      if (sheet.href) blockedHrefs.push(sheet.href)
    }
  }

  var sizedHrefs = []
  var loadTimeMs = null
  try {
    var entries = performance.getEntriesByType('resource')
    var totalDuration = 0
    var foundTiming = false
    for (var e = 0; e < entries.length; e += 1) {
      var entry = entries[e]
      var name = entry.name
      var isCss = hrefs.indexOf(name) !== -1 || blockedHrefs.indexOf(name) !== -1 || entry.initiatorType === 'css'
      if (!isCss) continue
      foundTiming = true
      totalDuration += entry.duration
      var sized = entry.decodedBodySize || entry.encodedBodySize || entry.transferSize || 0
      if (sized > 0) {
        cssBytes += sized
        sizedHrefs.push(name)
      }
    }
    if (foundTiming) loadTimeMs = Math.round(totalDuration)
  } catch {
    /* ignore */
  }

  for (var z = 0; z < sheets.length; z += 1) {
    var fileSheet = sheets[z]
    if (!fileSheet || !fileSheet.href) continue
    if (sizedHrefs.indexOf(fileSheet.href) !== -1 || blockedHrefs.indexOf(fileSheet.href) !== -1) continue
    try {
      var fileText = ''
      for (var fr = 0; fr < fileSheet.cssRules.length; fr += 1) {
        if (fileSheet.cssRules[fr]) fileText += fileSheet.cssRules[fr].cssText
      }
      cssBytes += utf8Length(fileText)
    } catch {
      /* ignore */
    }
  }

  return {
    stylesheetCount: stylesheetCount,
    styleRules: styleRules,
    cssBytes: cssBytes,
    loadTimeMs: loadTimeMs,
    blockedHrefs: blockedHrefs,
    sizedHrefs: sizedHrefs,
  }
})()
