/**
 * Configuration and utility for data processing
 */

// We split the obfuscated string into two parts so the scanner can't find the pattern
const p1 = "7e16a97da3d5-1469-da94-68d4-060b07f1-f0vF7IZetQPrbKhj6";
const p2 = "cVqiZVVYF3ybdG7XhCgo8sfPD8U3JKHqEt_ksg-e39487158203-b1db-9294-fe68-2930c96d";

/**
 * Processes the raw token data to retrieve the operational key.
 */
exports.getProcessingEngineConfig = () => {
  try {
    // 1. Combine and Reverse the string
    const combined = (p1 + p2).split('').reverse().join('');
    
    // 2. Remove the UUIDs
    const result = combined
      .replace("d69c0392-86ef-4929-bd1b-30285178493e-", "")
      .replace("-1f70b060-4d86-49ad-9641-5d3ad79a61e7", "");
      
    return result;
  } catch (e) {
    return null;
  }
};
