/**
 * SIGNAL WARFARE - RF Propagation Models
 * 
 * This file implements radio frequency propagation models for
 * simulating signal strength over distance with various attenuation factors.
 */

// RF propagation models are implemented in the RFPropagationSystem class
// This file will contain additional specialized propagation functions in future phases

// Calculate signal path loss in dB using the Friis transmission equation
function calculateFriisFreeSpace(distance, frequency, txPower, txGain, rxGain) {
  // Convert to proper units
  const distanceM = distance;
  const frequencyHz = frequency * 1000000; // MHz to Hz
  const wavelength = 299792458 / frequencyHz; // c/f
  
  // Calculate free space path loss
  const fspl = 20 * Math.log10(4 * Math.PI * distanceM / wavelength);
  
  // Calculate received power
  const rxPower = txPower + txGain + rxGain - fspl;
  
  return rxPower;
}
