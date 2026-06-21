import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Handles validation errors from express-validator.
 * Returns structured error response.
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: 'path' in e ? e.path : 'unknown',
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * Validation rules for footprint creation.
 */
export const footprintValidationRules = [
  body('transportation.carMiles')
    .isFloat({ min: 0, max: 50000 })
    .withMessage('Car miles must be between 0 and 50,000'),
  body('transportation.bikeMiles')
    .isFloat({ min: 0, max: 50000 })
    .withMessage('Bike miles must be between 0 and 50,000'),
  body('transportation.transitMiles')
    .isFloat({ min: 0, max: 50000 })
    .withMessage('Transit miles must be between 0 and 50,000'),
  body('transportation.flightHours')
    .isFloat({ min: 0, max: 500 })
    .withMessage('Flight hours must be between 0 and 500'),
  body('energy.electricityKwh')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Electricity must be between 0 and 10,000 kWh'),
  body('energy.renewablePercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Renewable percentage must be between 0 and 100'),
  body('dietType')
    .isIn(['vegan', 'vegetarian', 'mixed', 'high-meat'])
    .withMessage('Invalid diet type'),
  body('shopping.monthlySpend')
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Monthly spend must be between 0 and 100,000'),
  body('shopping.fastFashionFrequency')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Fast fashion frequency must be between 0 and 100'),
];

/**
 * Validation rules for user registration.
 */
export const registerValidationRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character'),
];

/**
 * Validation rules for login.
 */
export const loginValidationRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for roadmap generation.
 */
export const roadmapValidationRules = [
  body('strategyIds')
    .isArray({ min: 1 })
    .withMessage('Must select at least one strategy'),
  body('strategyIds.*')
    .isString()
    .withMessage('Strategy IDs must be strings'),
];
