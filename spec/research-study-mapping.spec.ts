import { convertTrialScopeToResearchStudy } from '../src/research-study-mapping';

describe('convertTrialScopeToResearchStudy', () => {
  it('converts as expected', () => {
    const researchStudy = convertTrialScopeToResearchStudy(
      {
        nctId: 'NCT12345678',
        title: 'Test Title',
        overallStatus: 'Available',
        phase: 'Phase 1/Phase 2',
        studyType: 'study type',
        conditions: '["condition 1", "condition 2"]',
        overallContactName: 'Overall Contact',
        overallContactPhone: '781-555-0100',
        overallContactEmail: 'email@example.com',
        keywords: '["keyword"]',
        countries: '["US"]',
        detailedDescription: 'Detailed description',
        officialTitle: 'Official Title',
        overallOfficialName: 'Overall Official',
        sites: [
          { facility: 'Facility', contactEmail: 'site@example.com', contactPhone: '781-555-0101', zipCode: '12345' }
        ],
        criteria: 'Criteria',
        sponsor: 'Sponsor'
      },
      1
    );
    expect(researchStudy.id).toEqual('study-1');
    expect(researchStudy.identifier).toBeDefined();
    if (researchStudy.identifier) {
      expect(researchStudy.identifier.length).toEqual(1);
      expect(researchStudy.identifier[0].use).toEqual('official');
      expect(researchStudy.identifier[0].system).toEqual('http://clinicaltrials.gov');
      expect(researchStudy.identifier[0].value).toEqual('NCT12345678');
    }
    expect(researchStudy.title).toEqual('Test Title');
    expect(researchStudy.status).toEqual('active');
    expect(researchStudy.phase).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/research-study-phase',
          code: 'phase-1-phase-2',
          display: 'Phase 1/Phase 2'
        }
      ],
      text: 'Phase 1/Phase 2'
    });
    expect(researchStudy.category).toEqual([{ text: 'Study Type: study type' }]);
    expect(researchStudy.condition).toEqual([{ text: 'condition 1' }, { text: 'condition 2' }]);
    expect(researchStudy.contact).toEqual([
      {
        name: 'Overall Contact',
        telecom: [
          { system: 'phone', value: '781-555-0100', use: 'work' },
          {
            system: 'email',
            value: 'email@example.com',
            use: 'work'
          }
        ]
      }
    ]);
    expect(researchStudy.keyword).toEqual([{ text: 'keyword' }]);
    expect(researchStudy.location).toEqual([{ text: 'US' }]);
    expect(researchStudy.description).toEqual('Detailed description');
    expect(researchStudy.objective).toEqual([{ name: 'Official Title' }]);
    expect(researchStudy.principalInvestigator).toEqual({ reference: '#practitioner-study-1', type: 'Practitioner' });
    expect(researchStudy.contained).toContain({
      resourceType: 'Practitioner',
      id: 'practitioner-study-1',
      name: [{ use: 'official', text: 'Overall Official' }]
    });
    expect(researchStudy.site).toEqual([{ reference: '#location-0', type: 'Location' }]);
    expect(researchStudy.contained).toContain({
      resourceType: 'Location',
      id: 'location-0',
      name: 'Facility',
      telecom: [
        { system: 'phone', value: '781-555-0101', use: 'work' },
        { system: 'email', value: 'site@example.com', use: 'work' }
      ],
      address: { use: 'work', postalCode: '12345' }
    });
    expect(researchStudy.enrollment).toEqual([{ reference: '#group-study-1', type: 'Group', display: 'Criteria' }]);
    expect(researchStudy.contained).toContain({
      resourceType: 'Group',
      id: 'group-study-1',
      type: 'person',
      actual: false
    });
    expect(researchStudy.sponsor).toEqual({ reference: '#org-study-1', type: 'Organization' });
    expect(researchStudy.contained).toContain({ resourceType: 'Organization', id: 'org-study-1', name: 'Sponsor' });
  });

  it('converts an empty trial', () => {
    const researchStudy = convertTrialScopeToResearchStudy({}, 1);
    expect(researchStudy.identifier).not.toBeDefined();
    expect(researchStudy.title).not.toBeDefined();
    expect(researchStudy.phase).not.toBeDefined();
    expect(researchStudy.category).not.toBeDefined();
  });

  it('does not set fields if given empty lists', () => {
    const researchStudy = convertTrialScopeToResearchStudy(
      {
        conditions: '[]',
        keywords: '[]',
        countries: '[]',
        sites: []
      },
      1
    );
    expect(researchStudy.condition).toBeUndefined();
    expect(researchStudy.keyword).toBeUndefined();
    expect(researchStudy.location).toBeUndefined();
    expect(researchStudy.site).toBeUndefined();
    expect(researchStudy.contained).toBeUndefined();
  });
});
