import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Test scenarios
const testScenarios = [
  {
    name: 'Valid Coupon - WELCOME10',
    coupon: {
      code: 'WELCOME10',
      orderTotal: 1000,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 2 }
      ]
    },
    expected: {
      success: true,
      discountAmount: 100
    }
  },
  {
    name: 'Valid Coupon - SAVE20',
    coupon: {
      code: 'SAVE20',
      orderTotal: 2000,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 4 }
      ]
    },
    expected: {
      success: true,
      discountAmount: 400
    }
  },
  {
    name: 'Valid Coupon - FLAT100',
    coupon: {
      code: 'FLAT100',
      orderTotal: 600,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 1 }
      ]
    },
    expected: {
      success: true,
      discountAmount: 100
    }
  },
  {
    name: 'Invalid - Below Minimum Order Value',
    coupon: {
      code: 'SAVE20',
      orderTotal: 500,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 1 }
      ]
    },
    expected: {
      success: false,
      error: 'minimum order value'
    }
  },
  {
    name: 'Invalid - Expired Coupon',
    coupon: {
      code: 'EXPIRED10',
      orderTotal: 1000,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 2 }
      ]
    },
    expected: {
      success: false,
      error: 'expired'
    }
  },
  {
    name: 'Invalid - Non-existent Coupon',
    coupon: {
      code: 'INVALID123',
      orderTotal: 1000,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 2 }
      ]
    },
    expected: {
      success: false,
      error: 'not found'
    }
  },
  {
    name: 'Max Discount Cap - SAVE20',
    coupon: {
      code: 'SAVE20',
      orderTotal: 10000,
      cartItems: [
        { productId: '507f1f77bcf86cd799439011', quantity: 20 }
      ]
    },
    expected: {
      success: true,
      discountAmount: 1000,
      note: 'Should be capped at maxDiscountAmount'
    }
  }
];

async function testCouponValidation() {
  console.log('🧪 Testing Coupon Validation System\n');
  console.log('='.repeat(60));
  console.log('\n');

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    console.log(`📋 Test: ${scenario.name}`);
    console.log(`   Code: ${scenario.coupon.code}`);
    console.log(`   Order Total: ₹${scenario.coupon.orderTotal}`);

    try {
      const response = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenario.coupon)
      });

      const result = await response.json();

      // Check if result matches expected
      const isSuccess = result.success === scenario.expected.success;
      let isValid = isSuccess;

      if (result.success) {
        // For successful validations, check discount amount
        if (scenario.expected.discountAmount) {
          const discountMatch = Math.abs(
            result.data.discountAmount - scenario.expected.discountAmount
          ) < 0.01;
          isValid = isValid && discountMatch;

          console.log(`   Discount Applied: ₹${result.data.discountAmount}`);
          console.log(`   Final Total: ₹${result.data.finalTotal}`);
        }
      } else {
        // For failed validations, check error message
        if (scenario.expected.error) {
          const errorMatch = result.message.toLowerCase().includes(
            scenario.expected.error.toLowerCase()
          );
          isValid = isValid && errorMatch;
        }

        console.log(`   Error: ${result.message}`);
      }

      if (isValid) {
        console.log(`   Result: ✅ PASSED`);
        passed++;
      } else {
        console.log(`   Result: ❌ FAILED`);
        console.log(`   Expected: ${JSON.stringify(scenario.expected)}`);
        console.log(`   Got: ${JSON.stringify(result)}`);
        failed++;
      }

      if (scenario.expected.note) {
        console.log(`   Note: ${scenario.expected.note}`);
      }
    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      failed++;
    }

    console.log('\n');
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   Total Tests: ${testScenarios.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / testScenarios.length) * 100).toFixed(1)}%`);
  console.log('\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Coupon validation system is working correctly.\n');
  } else {
    console.log('⚠️ Some tests failed. Please review the results above.\n');
  }
}

// Run tests
testCouponValidation().catch(console.error);
