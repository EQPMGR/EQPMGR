import { parseBikeText } from './src/lib/bike-parser.ts';

const text = `Frame
500 Series OCLV Carbon, IsoSpeed, internal storage, tapered head tube, internal cable routing, 3S chain keeper, fender mounts, flat mount disc, 142x12mm thru axle
Fork
Domane SL carbon, tapered carbon steerer, internal brake routing, fender mounts, flat mount disc, 12x100mm thru axle

Weight
Weight
56 - 8.89 kg / 19.6 lbs (with TLR sealant, no tubes)
Weight limit
This bike has a maximum total weight limit (combined weight of bicycle, rider, and cargo) of 275 pounds (125 kg).

E-system
Battery
Shimano BT-DN300

Drivetrain
Shifter
Shimano 105 R7170 Di2, 12 speed
Front derailleur
Shimano 105 R7150 Di2, braze-on, down swing
Rear derailleur
Shimano 105 R7150 Di2, 36T max cog
*Crank
Size: 47, 50
Shimano 105 R7100, 50/34, 165mm length
Size: 52, 54, 56
Shimano 105 R7100, 50/34, 170mm length
Size: 58, 60, 62
Shimano 105 R7100, 50/34, 172.5mm length
Bottom bracket
Praxis, T47 threaded, internal bearing
Cassette
Shimano 105 7101, 11-34, 12 speed
Chain
Shimano SLX M7100, 12 speed
Max chainring size
1x: 48T, 2x: 52/36

Wheels
Wheel front
Bontrager Aeolus Elite 35, OCLV Carbon, Tubeless Ready, 35 mm rim depth, 100x12 mm thru axle
Wheel rear
Bontrager Aeolus Elite 35, OCLV Carbon, Tubeless Ready, 35mm rim depth, Shimano 11-speed freehub, 142x12mm thru axle
Skewer front
Bontrager Switch thru axle
Skewer rear
Bontrager Switch thru axle, removable lever
Tire
Bontrager Kwaremont Pro GR, tubeless ready, folding bead, dual compound, 120 tpi, 700x32mm
Tire part
Bontrager TLR sealant, 180 ml/6 oz
Rim strip
Bontrager TLR
Max tire size
38mm without fenders, 35mm with fenders (as measured, see manual for details)

Components
Saddle
Verse Short Comp, steel rails, 145mm width
*Seatpost
Size: 47, 50
KVF aero carbon seatpost, 20mm offset, 280mm length
Size: 58, 60, 62
KVF aero carbon seatpost, 20mm offset, 320mm length
*Handlebar
Size: 47
Bontrager Comp, alloy, 31.8mm, 80mm reach, 121mm drop, 36cm control width, 40cm drop width
Size: 50, 52
Bontrager Comp, alloy, 31.8mm, 80mm reach, 121mm drop, 38cm control width, 42cm drop width
Size: 54, 56, 58
Bontrager Comp, alloy, 31.8mm, 80mm reach, 121mm drop, 40cm control width, 44cm drop width
Size: 60, 62
Bontrager Comp, alloy, 31.8mm, 80mm reach, 121mm drop, 42cm control width, 46cm drop width
Handlebar tape
Trek EcoTack
*Stem
Size: 47
Trek RCS Pro, -7 degree, 70mm length
Size: 50
Trek RCS Pro, -7 degree, 80mm length
Size: 52, 54
Trek RCS Pro, -7 degree, 90mm length
Size: 56, 58
Trek RCS Pro, -7 degree, 100mm length
Size: 60, 62
Trek RCS Pro, -7 degree, 110mm length
Brake
Shimano 105 hydraulic disc, flat mount
Brake rotor
Shimano CL700, centerlock, 160mm
Rotor size
Max brake rotor sizes: 160mm front & rear`;

console.log(JSON.stringify(parseBikeText(text), null, 2));
