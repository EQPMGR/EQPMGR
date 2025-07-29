
type TireComponent = {
    name: 'Tire';
    brand: string;
    model: string;
    system: 'Wheelset';
    size: string;
};

export const TIRE_COMPONENTS: TireComponent[] = [
    // Continental
    { name: 'Tire', brand: 'Continental', model: 'Grand Prix 5000 S TR', system: 'Wheelset', size: '700x25c' },
    { name: 'Tire', brand: 'Continental', model: 'Grand Prix 5000 S TR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Continental', model: 'Grand Prix 5000 S TR', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Continental', model: 'Grand Prix 5000 S TR', system: 'Wheelset', size: '700x32c' },
    { name: 'Tire', brand: 'Continental', model: 'GP 5000 AS TR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Continental', model: 'GP 5000 AS TR', system: 'Wheelset', size: '700x32c' },
    { name: 'Tire', brand: 'Continental', model: 'Terra Speed', system: 'Wheelset', size: '700x35c' },
    { name: 'Tire', brand: 'Continental', model: 'Terra Speed', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Continental', model: 'Terra Trail', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Continental', model: 'Terra Trail', system: 'Wheelset', size: '650x47b' },
    { name: 'Tire', brand: 'Continental', model: 'Cross King', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Continental', model: 'Cross King', system: 'Wheelset', size: '27.5x2.3' },
    { name: 'Tire', brand: 'Continental', model: 'Mountain King', system: 'Wheelset', size: '29x2.3' },
    { name: 'Tire', brand: 'Continental', model: 'Race King', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Continental', model: 'Kryptotal-FR', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Continental', model: 'Kryptotal-RE', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Continental', model: 'Argotal', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Continental', model: 'Der Baron Projekt', system: 'Wheelset', size: '27.5x2.4' },
    { name: 'Tire', brand: 'Continental', model: 'Der Kaiser Projekt', system: 'Wheelset', size: '27.5x2.4' },

    // Maxxis
    { name: 'Tire', brand: 'Maxxis', model: 'Recon Race', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Maxxis', model: 'Recon Race', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Maxxis', model: 'MaxxSpeed Race', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Maxxis', model: 'Aspen', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Maxxis', model: 'Aspen', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Maxxis', model: 'Ikon', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Maxxis', model: 'Ikon', system: 'Wheelset', size: '27.5x2.2' },
    { name: 'Tire', brand: 'Maxxis', model: 'Minion DHF', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Maxxis', model: 'Minion DHF', system: 'Wheelset', size: '29x2.5 WT' },
    { name: 'Tire', brand: 'Maxxis', model: 'Minion DHF', system: 'Wheelset', size: '27.5x2.5 WT' },
    { name: 'Tire', brand: 'Maxxis', model: 'Minion DHR II', system: 'Wheelset', size: '29x2.3' },
    { name: 'Tire', brand: 'Maxxis', model: 'Minion DHR II', system: 'Wheelset', size: '29x2.4 WT' },
    { name: 'Tire', brand: 'Maxxis', model: 'Assegai', system: 'Wheelset', size: '29x2.5 WT' },
    { name: 'Tire', brand: 'Maxxis', model: 'Dissector', system: 'Wheelset', size: '29x2.4 WT' },
    { name: 'Tire', brand: 'Maxxis', model: 'Ardent Race', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Maxxis', model: 'Rambler', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Maxxis', model: 'Rambler', system: 'Wheelset', size: '650x47b' },
    { name: 'Tire', brand: 'Maxxis', model: 'Reaver', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Maxxis', model: 'Reaver', system: 'Wheelset', size: '700x45c' },

    // Schwalbe
    { name: 'Tire', brand: 'Schwalbe', model: 'Pro One TT', system: 'Wheelset', size: '700x25c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Pro One', system: 'Wheelset', size: '700x25c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Pro One', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Pro One', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'One', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'One', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'G-One Allround', system: 'Wheelset', size: '700x35c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'G-One Allround', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'G-One Allround', system: 'Wheelset', size: '650x50b' },
    { name: 'Tire', brand: 'Schwalbe', model: 'G-One R', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'G-One RS', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Racing Ralph', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Racing Ralph', system: 'Wheelset', size: '27.5x2.25' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Racing Ray', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Racing Ray', system: 'Wheelset', size: '27.5x2.25' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Nobby Nic', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Nobby Nic', system: 'Wheelset', size: '27.5x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Magic Mary', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Magic Mary', system: 'Wheelset', size: '27.5x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Big Betty', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Big Betty', system: 'Wheelset', size: '27.5x2.4' },
    { name: 'Tire', brand: 'Schwalbe', model: 'Hans Dampf', system: 'Wheelset', size: '29x2.35' },

    // Pirelli
    { name: 'Tire', brand: 'Pirelli', model: 'P Zero Race TLR', system: 'Wheelset', size: '700x26c' },
    { name: 'Tire', brand: 'Pirelli', model: 'P Zero Race TLR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Pirelli', model: 'P Zero Race TLR', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Pirelli', model: 'P Zero Race SL TLR', system: 'Wheelset', size: '700x26c' },
    { name: 'Tire', brand: 'Pirelli', model: 'P Zero Race SL TLR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Cinturato Gravel M', system: 'Wheelset', size: '700x35c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Cinturato Gravel M', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Cinturato Gravel H', system: 'Wheelset', size: '700x35c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Cinturato Gravel H', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Cinturato Velo TLR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Pirelli', model: 'Scorpion XC M', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Pirelli', model: 'Scorpion XC M', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Pirelli', model: 'Scorpion Race DH M', system: 'Wheelset', size: '29x2.5' },
    { name: 'Tire', brand: 'Pirelli', model: 'Scorpion Race EN M', system: 'Wheelset', size: '29x2.4' },

    // Vittoria
    { name: 'Tire', brand: 'Vittoria', model: 'Corsa PRO', system: 'Wheelset', size: '700x26c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Corsa PRO', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Corsa PRO', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Corsa N.EXT', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Corsa N.EXT', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Terreno Dry', system: 'Wheelset', size: '700x35c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Terreno Dry', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Terreno Wet', system: 'Wheelset', size: '700x38c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Terreno Mix', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Vittoria', model: 'Mezcal', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Vittoria', model: 'Mezcal', system: 'Wheelset', size: '29x2.35' },
    { name: 'Tire', brand: 'Vittoria', model: 'Barzo', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Vittoria', model: 'Barzo', system: 'Wheelset', size: '29x2.35' },
    { name: 'Tire', brand: 'Vittoria', model: 'Syerrra', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Vittoria', model: 'Mazna', system: 'Wheelset', size: '29x2.4' },

    // Goodyear
    { name: 'Tire', brand: 'Goodyear', model: 'Eagle F1 R', system: 'Wheelset', size: '700x25c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Eagle F1 R', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Eagle F1 R', system: 'Wheelset', size: '700x30c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Vector 4Seasons', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Connector', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Connector', system: 'Wheelset', size: '700x50c' },
    { name: 'Tire', brand: 'Goodyear', model: 'Peak', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Goodyear', model: 'Newton MTF', system: 'Wheelset', size: '29x2.5' },
    { name: 'Tire', brand: 'Goodyear', model: 'Newton MTR', system: 'Wheelset', size: '29x2.4' },

    // Michelin
    { name: 'Tire', brand: 'Michelin', model: 'Power Road TLR', system: 'Wheelset', size: '700x25c' },
    { name: 'Tire', brand: 'Michelin', model: 'Power Road TLR', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Michelin', model: 'Power Cup Classic', system: 'Wheelset', size: '700x28c' },
    { name: 'Tire', brand: 'Michelin', model: 'Power Gravel', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'Michelin', model: 'Wild Enduro Front', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Michelin', model: 'Wild Enduro Rear', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'Michelin', model: 'Force XC', system: 'Wheelset', size: '29x2.25' },

    // Teravail
    { name: 'Tire', brand: 'Teravail', model: 'Rutland', system: 'Wheelset', size: '700x42c' },
    { name: 'Tire', brand: 'Teravail', model: 'Rutland', system: 'Wheelset', size: '650x47b' },
    { name: 'Tire', brand: 'Teravail', model: 'Cannonball', system: 'Wheelset', size: '700x42c' },
    { name: 'Tire', brand: 'Teravail', model: 'Cannonball', system: 'Wheelset', size: '650x47b' },
    { name: 'Tire', brand: 'Teravail', model: 'Sparwood', system: 'Wheelset', size: '29x2.2' },
    { name: 'Tire', brand: 'Teravail', model: 'Kessel', system: 'Wheelset', size: '29x2.4' },

    // WTB
    { name: 'Tire', brand: 'WTB', model: 'Raddler', system: 'Wheelset', size: '700x40c' },
    { name: 'Tire', brand: 'WTB', model: 'Raddler', system: 'Wheelset', size: '700x44c' },
    { name: 'Tire', brand: 'WTB', model: 'Resolute', system: 'Wheelset', size: '700x42c' },
    { name: 'Tire', brand: 'WTB', model: 'Sendero', system: 'Wheelset', size: '650x47b' },
    { name: 'Tire', brand: 'WTB', model: 'Vigilante', system: 'Wheelset', size: '29x2.5' },
    { name: 'Tire', brand: 'WTB', model: 'Trail Boss', system: 'Wheelset', size: '29x2.4' },
    { name: 'Tire', brand: 'WTB', model: 'Verdict', system: 'Wheelset', size: '29x2.5' },

    // Duro
    { name: 'Tire', brand: 'Duro', model: 'Mineo', system: 'Wheelset', size: '29x2.25' },
    { name: 'Tire', brand: 'Duro', model: 'Tireo', system: 'Wheelset', size: '27.5x2.35' },
    { name: 'Tire', brand: 'Duro', model: 'Cyclocross', system: 'Wheelset', size: '700x33c' },
];
