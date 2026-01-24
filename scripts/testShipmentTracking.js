import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Sample tracking numbers for testing
const trackingNumbers = [
  'EA123456780IN', // Label created
  'EA123456781IN', // In transit
  'EA123456782IN', // Reached hub
  'EA123456783IN', // Out for delivery
  'EA123456784IN'  // Delivered
];

async function testShipmentTracking() {
  console.log('🚚 Testing Shipment Tracking System\n');
  console.log('='.repeat(60));
  console.log('\n');

  for (const trackingNumber of trackingNumbers) {
    console.log(`📦 Tracking Number: ${trackingNumber}`);

    try {
      const response = await fetch(
        `${API_BASE_URL}/shipments/track/${trackingNumber}`
      );

      const result = await response.json();

      if (result.success) {
        const { data } = result;

        console.log(`   Status: ✅ ${data.currentStatus.toUpperCase()}`);
        console.log(`   Courier: ${data.courierProvider}`);

        if (data.estimatedDeliveryDate) {
          console.log(`   Est. Delivery: ${new Date(data.estimatedDeliveryDate).toDateString()}`);
        }

        if (data.actualDeliveryDate) {
          console.log(`   Delivered On: ${new Date(data.actualDeliveryDate).toDateString()}`);
        }

        console.log(`   Last Update: ${new Date(data.lastUpdate).toLocaleString()}`);
        console.log(`\n   📍 Tracking Events:`);

        data.trackingEvents.forEach((event, index) => {
          const timestamp = new Date(event.timestamp).toLocaleString();
          console.log(`      ${index + 1}. [${timestamp}] ${event.status}`);
          console.log(`         Location: ${event.location}`);
          console.log(`         ${event.description}`);
        });
      } else {
        console.log(`   Status: ❌ ${result.message}`);
      }
    } catch (error) {
      console.log(`   Status: ❌ ERROR - ${error.message}`);
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }

  console.log('✨ Tracking test completed!\n');
  console.log('📝 Note: These are mock tracking responses for development.');
  console.log('   In production, set USE_INDIA_POST_AGGREGATOR=true and');
  console.log('   configure your tracking API credentials.\n');
}

// Run tests
testShipmentTracking().catch(console.error);
