import { Validators } from '../src/utils/validators';

describe('Validators', () => {
  describe('validateMSISDN', () => {
    it('should validate correct MSISDN', () => {
      expect(Validators.validateMSISDN('0340123456')).toBe(true);
      expect(Validators.validateMSISDN('261340123456')).toBe(true);
    });

    it('should reject invalid MSISDN', () => {
      expect(Validators.validateMSISDN('123')).toBe(false);
      expect(Validators.validateMSISDN('abcd123456')).toBe(false);
    });
  });

  describe('validateDescription', () => {
    it('should validate correct description', () => {
      expect(() => Validators.validateDescription('Valid description')).not.toThrow();
      expect(() => Validators.validateDescription('Test-payment_2024.01')).not.toThrow();
    });

    it('should reject long description', () => {
      const longDescription = 'a'.repeat(51);
      expect(() => Validators.validateDescription(longDescription)).toThrow();
    });

    it('should reject invalid characters', () => {
      expect(() => Validators.validateDescription('Invalid@description')).toThrow();
    });
  });

  describe('validateAmount', () => {
    it('should validate positive integer amounts', () => {
      expect(() => Validators.validateAmount(1000)).not.toThrow();
      expect(() => Validators.validateAmount(1)).not.toThrow();
    });

    it('should reject negative amounts', () => {
      expect(() => Validators.validateAmount(-100)).toThrow();
      expect(() => Validators.validateAmount(0)).toThrow();
    });

    it('should reject decimal amounts', () => {
      expect(() => Validators.validateAmount(100.50)).toThrow();
    });
  });
});
