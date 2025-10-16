#!/usr/bin/env node

/**
 * Script pour obtenir l'IP réseau de la machine
 */

const os = require('os');

const getNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les interfaces non-IPv4 et les adresses internes
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          interface: name,
          ip: iface.address,
          netmask: iface.netmask
        });
      }
    }
  }
  
  return ips;
};

const main = () => {
  console.log('🌐 Adresses IP réseau de cette machine :\n');
  
  const ips = getNetworkIP();
  
  if (ips.length === 0) {
    console.log('❌ Aucune adresse IP réseau trouvée');
    return;
  }
  
  ips.forEach((ipInfo, index) => {
    console.log(`${index + 1}. Interface: ${ipInfo.interface}`);
    console.log(`   IP: ${ipInfo.ip}`);
    console.log(`   URL Backend: http://${ipInfo.ip}:3000`);
    console.log('');
  });
  
  // Recommander la première IP (généralement la principale)
  const mainIP = ips[0];
  console.log('🎯 IP RECOMMANDÉE :');
  console.log(`   ${mainIP.ip}`);
  console.log(`   URL: http://${mainIP.ip}:3000`);
  
  // Générer la commande pour mettre à jour
  console.log('\n📝 Pour mettre à jour automatiquement :');
  console.log(`   node scripts/update-ip.js`);
};

main();
