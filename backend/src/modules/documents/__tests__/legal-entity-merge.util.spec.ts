import {
  buildLegalEntityMergeData,
  formatLegalEntityAddressBlock,
  formatLegalEntityStatutoryBlock,
} from '../legal-entity-merge.util';

describe('legal-entity-merge.util', () => {
  const entity = {
    registeredName: 'Digitaro Labs (Private) Limited',
    tradingName: 'Digitaro Labs',
    countryCode: 'PK',
    addressLine1: 'Office 12, Plot 45',
    addressLine2: null,
    city: 'Islamabad',
    stateProvince: 'ICT',
    postalCode: '44000',
    phone: '+92 51 8899 0100',
    email: 'legal.pk@digitaro.co',
    website: 'https://digitaro.co',
    footerText: 'Confidential.',
  };

  it('formats a multi-line address block', () => {
    expect(formatLegalEntityAddressBlock(entity)).toBe(
      'Office 12, Plot 45\nIslamabad, ICT, 44000\nPK',
    );
  });

  it('formats statutory IDs with human labels', () => {
    expect(
      formatLegalEntityStatutoryBlock([
        { fieldKey: 'ntn', fieldValue: '1234567-8' },
        { fieldKey: 'secp_registration', fieldValue: '0123456' },
      ]),
    ).toBe('NTN: 1234567-8\nSECP Registration: 0123456');
  });

  it('builds dotted merge fields including statutory keys', () => {
    const merge = buildLegalEntityMergeData(entity, [
      { fieldKey: 'ntn', fieldValue: '1234567-8' },
    ]);
    expect(merge['legal_entity.registered_name']).toBe(
      'Digitaro Labs (Private) Limited',
    );
    expect(merge['legal_entity.ntn']).toBe('1234567-8');
    expect(merge['legal_entity.address_block']).toContain('Islamabad');
    expect(merge['legal_entity.statutory_ids_block']).toContain('NTN:');
  });
});
