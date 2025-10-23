const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// é©¬æ¥è¥¿äºšè´·æ¬¾æ”¯ä»˜è¡¨ (4.88% åˆ©çŽ‡)
const MALAYSIAN_LOAN_TABLE = {
  5000: { 12: 437.00, 24: 229.00, 36: 159.00, 48: 124.00, 60: 104.00 },
  10000: { 12: 874.00, 24: 457.00, 36: 318.00, 48: 249.00, 60: 207.00, 72: 180.00, 84: 160.00, 96: 145.00, 108: 133.00 },
  15000: { 12: 1311.00, 24: 685.00, 36: 478.00, 48: 373.00, 60: 311.00, 72: 269.00, 84: 240.00, 96: 217.00, 108: 200.00 },
  20000: { 12: 1748.00, 24: 915.00, 36: 637.00, 48: 498.00, 60: 415.00, 72: 359.00, 84: 319.00, 96: 290.00, 108: 267.00 },
  25000: { 12: 2185.00, 24: 1143.00, 36: 796.00, 48: 622.00, 60: 518.00, 72: 449.00, 84: 399.00, 96: 362.00, 108: 333.00 },
  30000: { 12: 2622.00, 24: 1372.00, 36: 955.00, 48: 747.00, 60: 622.00, 72: 539.00, 84: 479.00, 96: 434.00, 108: 400.00 },
  35000: { 12: 3059.00, 24: 1601.00, 36: 1115.00, 48: 871.00, 60: 726.00, 72: 628.00, 84: 559.00, 96: 507.00, 108: 466.00 },
  40000: { 12: 3496.00, 24: 1829.00, 36: 1274.00, 48: 996.00, 60: 829.00, 72: 718.00, 84: 639.00, 96: 579.00, 108: 533.00 },
  45000: { 12: 3933.00, 24: 2058.00, 36: 1433.00, 48: 1120.00, 60: 933.00, 72: 808.00, 84: 719.00, 96: 652.00, 108: 600.00 },
  50000: { 12: 4370.00, 24: 2287.00, 36: 1592.00, 48: 1245.00, 60: 1037.00, 72: 898.00, 84: 799.00, 96: 724.00, 108: 666.00 },
  60000: { 12: 5244.00, 24: 2744.00, 36: 1911.00, 48: 1494.00, 60: 1244.00, 72: 1077.00, 84: 958.00, 96: 869.00, 108: 800.00 },
  70000: { 12: 6118.00, 24: 3201.00, 36: 2229.00, 48: 1743.00, 60: 1451.00, 72: 1257.00, 84: 1118.00, 96: 1014.00, 108: 933.00 },
  80000: { 12: 6992.00, 24: 3659.00, 36: 2548.00, 48: 1992.00, 60: 1659.00, 72: 1436.00, 84: 1278.00, 96: 1159.00, 108: 1067.00 }
};

// è®¡ç®—éªŒè¯è§„åˆ™
const calculateValidation = [
  body('amount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('è´·æ¬¾é‡‘é¢å¿…é¡»åœ¨RM 1,000 åˆ° RM 100,000 ä¹‹é—´'),
  body('term')
    .isIn([12, 24, 36, 48, 60, 72, 84, 96, 108])
    .withMessage('è¯·é€‰æ‹©æœ‰æ•ˆçš„è´·æ¬¾æœŸé™'),
  body('interestRate')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('åˆ©çŽ‡å¿…é¡»åœ¨0%åˆ°50%ä¹‹é—´')
];

// èŽ·å–è¡¨æ ¼ä¸­çš„æ”¯ä»˜é‡‘é¢
const getTablePayment = (amount, term) => {
  const amounts = Object.keys(MALAYSIAN_LOAN_TABLE).map(Number).sort((a, b) => a - b);
  const closestAmount = amounts.find(a => a >= amount) || amounts[amounts.length - 1];
  const table = MALAYSIAN_LOAN_TABLE[closestAmount];

  if (table && table[term]) {
    const ratio = amount / closestAmount;
    return table[term] * ratio;
  }
  return null;
};

// æ ‡å‡†è´·æ¬¾è®¡ç®—å…¬å¼
const calculateLoanPayment = (principal, annualRate, termInMonths) => {
  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / termInMonths;
  }

  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) /
                        (Math.pow(1 + monthlyRate, termInMonths) - 1);

  return monthlyPayment;
};

// @route   POST /api/calculator/calculate
// @desc    è®¡ç®—è´·æ¬¾æ”¯ä»˜è¯¦æƒ…
// @access  Public
router.post('/calculate', calculateValidation, async (req, res) => {
  try {
    // æ£€æŸ¥éªŒè¯é”™è¯¯
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'æ•°æ®éªŒè¯å¤±è´¥',
        errors: errors.array()
      });
    }

    const { amount, term, interestRate = parseFloat(process.env.DEFAULT_INTEREST_RATE) || 4.88 } = req.body;

    let monthlyPayment;
    let calculationMethod;

    // ä¼˜å…ˆä½¿ç”¨é©¬æ¥è¥¿äºšè¡¨æ ¼è®¡ç®—
    const tablePayment = getTablePayment(amount, term);
    if (tablePayment) {
      monthlyPayment = tablePayment;
      calculationMethod = 'malaysian_table';
    } else {
      monthlyPayment = calculateLoanPayment(amount, interestRate, term);
      calculationMethod = 'standard_formula';
    }

    // è®¡ç®—æ€»æ”¯ä»˜å’Œæ€»åˆ©æ¯
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - amount;

    // è®¡ç®—åˆ©æ¯ç™¾åˆ†æ¯”
    const interestPercentage = (totalInterest / amount) * 100;

    res.json({
      status: 'success',
      data: {
        calculation: {
          loanAmount: amount,
          interestRate: interestRate,
          termMonths: term,
          termYears: parseFloat((term / 12).toFixed(1)),
          monthlyPayment: Math.round(monthlyPayment * 100) / 100,
          totalPayment: Math.round(totalPayment * 100) / 100,
          totalInterest: Math.round(totalInterest * 100) / 100,
          interestPercentage: Math.round(interestPercentage * 100) / 100,
          calculationMethod,
          currency: 'MYR'
        },
        breakdown: {
          principal: amount,
          interest: Math.round(totalInterest * 100) / 100,
          monthlyPrincipal: Math.round((amount / term) * 100) / 100,
          monthlyInterest: Math.round((totalInterest / term) * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('è®¡ç®—é”™è¯¯:', error);
    res.status(500).json({
      status: 'error',
      message: 'è®¡ç®—å¤±è´¥ï¼Œè¯·ç¨åŽå†è¯•'
    });
  }
});

// @route   GET /api/calculator/rates
// @desc    èŽ·å–å½“å‰åˆ©çŽ‡ä¿¡æ¯
// @access  Public
router.get('/rates', async (req, res) => {
  try {
    const rates = {
      default: parseFloat(process.env.DEFAULT_INTEREST_RATE) || 4.88,
      ranges: {
        excellent: { min: 4.88, max: 7.00, description: 'Excellent Credit (750+)' },
        good: { min: 4.88, max: 10.32, description: 'Good Credit (700-749)' },
        fair: { min: 4.88, max: 14.68, description: 'Fair Credit (650-699)' },
        poor: { min: 4.88, max: 18.00, description: 'Poor Credit (600-649)' }
      },
      features: [
        'Fixed rate for all qualified applicants',
        '1 business day approval',
        'Follows Bank Negara Malaysia guidelines',
        'Competitive rates for Malaysian residents'
      ],
      lastUpdated: new Date().toISOString()
    };

    res.json({
      status: 'success',
      data: {
        rates
      }
    });

  } catch (error) {
    console.error('èŽ·å–åˆ©çŽ‡é”™è¯¯:', error);
    res.status(500).json({
      status: 'error',
      message: 'èŽ·å–åˆ©çŽ‡ä¿¡æ¯å¤±è´¥'
    });
  }
});

// @route   GET /api/calculator/payment-table
// @desc    èŽ·å–é©¬æ¥è¥¿äºšè´·æ¬¾æ”¯ä»˜è¡¨
// @access  Public
router.get('/payment-table', async (req, res) => {
  try {
    const { amount, term } = req.query;

    // å¦‚æžœæä¾›äº†ç‰¹å®šå‚æ•°ï¼Œè®¡ç®—ç‰¹å®šå€¼
    if (amount && term) {
      const loanAmount = parseFloat(amount);
      const loanTerm = parseInt(term);

      if (loanAmount >= 1000 && loanAmount <= 100000 && [12, 24, 36, 48, 60, 72, 84, 96, 108].includes(loanTerm)) {
        const payment = getTablePayment(loanAmount, loanTerm);
        
        if (payment) {
          return res.json({
            status: 'success',
            data: {
              amount: loanAmount,
              term: loanTerm,
              monthlyPayment: Math.round(payment * 100) / 100,
              totalPayment: Math.round(payment * loanTerm * 100) / 100,
              totalInterest: Math.round((payment * loanTerm - loanAmount) * 100) / 100,
              source: 'malaysian_table'
            }
          });
        }
      }
    }

    // è¿”å›žå®Œæ•´çš„æ”¯ä»˜è¡¨
    const formattedTable = Object.keys(MALAYSIAN_LOAN_TABLE).map(amount => {
      const amountNum = parseInt(amount);
      const payments = MALAYSIAN_LOAN_TABLE[amountNum];
      
      return {
        amount: amountNum,
        payments: Object.keys(payments).map(term => ({
          termMonths: parseInt(term),
          termYears: parseFloat((parseInt(term) / 12).toFixed(1)),
          monthlyPayment: payments[term],
          totalPayment: payments[term] * parseInt(term),
          totalInterest: (payments[term] * parseInt(term)) - amountNum
        }))
      };
    });

    res.json({
      status: 'success',
      data: {
        paymentTable: formattedTable,
        interestRate: 4.88,
        currency: 'MYR',
        description: 'Pre-calculated monthly payments for common loan amounts and terms in Malaysian Ringgit',
        features: [
          'Fixed 4.88% interest rate',
          'Malaysian lending guidelines compliance',
          'No hidden fees or charges',
          'Transparent pricing'
        ]
      }
    });

  } catch (error) {
    console.error('èŽ·å–æ”¯ä»˜è¡¨é”™è¯¯:', error);
    res.status(500).json({
      status: 'error',
      message: 'èŽ·å–æ”¯ä»˜è¡¨å¤±è´¥'
    });
  }
});

// @route   POST /api/calculator/compare
// @desc    æ¯”è¾ƒä¸åŒè´·æ¬¾æ–¹æ¡ˆ
// @access  Public
router.post('/compare', async (req, res) => {
  try {
    const { scenarios } = req.body;

    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'è¯·æä¾›è¦æ¯”è¾ƒçš„è´·æ¬¾æ–¹æ¡ˆ'
      });
    }

    if (scenarios.length > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'æœ€å¤šåªèƒ½æ¯”è¾ƒ5ä¸ªæ–¹æ¡ˆ'
      });
    }

    const comparisons = scenarios.map((scenario, index) => {
      const { amount, term, interestRate = 4.88, label } = scenario;

      // éªŒè¯å‚æ•°
      if (!amount || !term || amount < 1000 || amount > 100000 || ![12, 24, 36, 48, 60, 72, 84, 96, 108].includes(term)) {
        throw new Error(`æ–¹æ¡ˆ ${index + 1} å‚æ•°æ— æ•ˆ`);
      }

      let monthlyPayment;
      let calculationMethod;

      // ä¼˜å…ˆä½¿ç”¨è¡¨æ ¼è®¡ç®—
      const tablePayment = getTablePayment(amount, term);
      if (tablePayment && interestRate === 4.88) {
        monthlyPayment = tablePayment;
        calculationMethod = 'malaysian_table';
      } else {
        monthlyPayment = calculateLoanPayment(amount, interestRate, term);
        calculationMethod = 'standard_formula';
      }

      const totalPayment = monthlyPayment * term;
      const totalInterest = totalPayment - amount;

      return {
        id: index + 1,
        label: label || `æ–¹æ¡ˆ ${index + 1}`,
        amount,
        term,
        termYears: parseFloat((term / 12).toFixed(1)),
        interestRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        interestPercentage: Math.round((totalInterest / amount) * 100 * 100) / 100,
        calculationMethod
      };
    });

    // æ‰¾å‡ºæœ€ä½³æ–¹æ¡ˆ
    const lowestMonthlyPayment = Math.min(...comparisons.map(c => c.monthlyPayment));
    const lowestTotalInterest = Math.min(...comparisons.map(c => c.totalInterest));

    const analysis = {
      bestMonthlyPayment: comparisons.find(c => c.monthlyPayment === lowestMonthlyPayment),
      lowestTotalInterest: comparisons.find(c => c.totalInterest === lowestTotalInterest),
      summary: {
        totalScenarios: comparisons.length,
        monthlyPaymentRange: {
          min: lowestMonthlyPayment,
          max: Math.max(...comparisons.map(c => c.monthlyPayment))
        },
        totalInterestRange: {
          min: lowestTotalInterest,
          max: Math.max(...comparisons.map(c => c.totalInterest))
        }
      }
    };

    res.json({
      status: 'success',
      data: {
        comparisons,
        analysis
      }
    });

  } catch (error) {
    console.error('æ¯”è¾ƒè®¡ç®—é”™è¯¯:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'æ¯”è¾ƒè®¡ç®—å¤±è´¥'
    });
  }
});

module.exports = router;


