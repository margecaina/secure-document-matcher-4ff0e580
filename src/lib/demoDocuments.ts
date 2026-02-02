// Demo document content for testing the comparison tool

export const demoSetMatching = {
  name: "Matching Documents",
  description: "Two identical contract documents",
  documentA: {
    fileName: "Contract_Final_v1.pdf",
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 15, 2024, by and between:

Party A: Acme Corporation, a Delaware corporation with its principal place of business at 123 Business Park Drive, Suite 400, San Francisco, CA 94102 ("Service Provider")

Party B: TechStart Inc., a California corporation with its principal place of business at 456 Innovation Way, Palo Alto, CA 94301 ("Client")

WHEREAS, Service Provider is engaged in the business of providing software development and consulting services; and

WHEREAS, Client desires to engage Service Provider to provide certain services as described herein;

NOW, THEREFORE, in consideration of the mutual covenants and agreements set forth herein, the parties agree as follows:

1. SERVICES
Service Provider agrees to provide the following services to Client:
- Software development and maintenance
- Technical consulting and advisory services
- System integration and deployment
- Training and documentation

2. TERM
This Agreement shall commence on February 1, 2024 and continue for a period of twelve (12) months, unless earlier terminated in accordance with Section 7.

3. COMPENSATION
Client agrees to pay Service Provider the sum of $150,000 USD, payable in monthly installments of $12,500 USD, due on the first business day of each month.

4. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all proprietary information disclosed during the term of this Agreement.

5. INTELLECTUAL PROPERTY
All intellectual property created during the performance of services shall remain the property of Client upon full payment.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_______________________
Authorized Signature
Acme Corporation

_______________________
Authorized Signature
TechStart Inc.`
  },
  documentB: {
    fileName: "Contract_Final_v1_copy.pdf",
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 15, 2024, by and between:

Party A: Acme Corporation, a Delaware corporation with its principal place of business at 123 Business Park Drive, Suite 400, San Francisco, CA 94102 ("Service Provider")

Party B: TechStart Inc., a California corporation with its principal place of business at 456 Innovation Way, Palo Alto, CA 94301 ("Client")

WHEREAS, Service Provider is engaged in the business of providing software development and consulting services; and

WHEREAS, Client desires to engage Service Provider to provide certain services as described herein;

NOW, THEREFORE, in consideration of the mutual covenants and agreements set forth herein, the parties agree as follows:

1. SERVICES
Service Provider agrees to provide the following services to Client:
- Software development and maintenance
- Technical consulting and advisory services
- System integration and deployment
- Training and documentation

2. TERM
This Agreement shall commence on February 1, 2024 and continue for a period of twelve (12) months, unless earlier terminated in accordance with Section 7.

3. COMPENSATION
Client agrees to pay Service Provider the sum of $150,000 USD, payable in monthly installments of $12,500 USD, due on the first business day of each month.

4. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all proprietary information disclosed during the term of this Agreement.

5. INTELLECTUAL PROPERTY
All intellectual property created during the performance of services shall remain the property of Client upon full payment.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_______________________
Authorized Signature
Acme Corporation

_______________________
Authorized Signature
TechStart Inc.`
  }
};

export const demoSetMismatched = {
  name: "Mismatched Documents",
  description: "Contract with unauthorized changes",
  documentA: {
    fileName: "Contract_Original.pdf",
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 15, 2024, by and between:

Party A: Acme Corporation, a Delaware corporation ("Service Provider")
Party B: TechStart Inc., a California corporation ("Client")

1. SERVICES
Service Provider agrees to provide the following services:
- Software development and maintenance
- Technical consulting services
- System integration and deployment
- Training and documentation

2. TERM
This Agreement shall commence on February 1, 2024 and continue for a period of twelve (12) months.

3. COMPENSATION
Client agrees to pay Service Provider the sum of $150,000 USD, payable in monthly installments of $12,500 USD.

4. TERMINATION
Either party may terminate this Agreement with thirty (30) days written notice.

5. LIABILITY
Service Provider's liability shall not exceed the total fees paid under this Agreement.

6. CONFIDENTIALITY
Both parties agree to maintain strict confidentiality of all proprietary information.

IN WITNESS WHEREOF, the parties have executed this Agreement.`
  },
  documentB: {
    fileName: "Contract_Modified.pdf",
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of January 20, 2024, by and between:

Party A: Acme Corporation, a Delaware corporation ("Service Provider")
Party B: TechStart Inc., a California corporation ("Client")

1. SERVICES
Service Provider agrees to provide the following services:
- Software development only
- Technical consulting services
- System integration and deployment

2. TERM
This Agreement shall commence on February 1, 2024 and continue for a period of twenty-four (24) months.

3. COMPENSATION
Client agrees to pay Service Provider the sum of $200,000 USD, payable in monthly installments of $8,333 USD.

4. TERMINATION
Either party may terminate this Agreement with ninety (90) days written notice.

5. LIABILITY
Service Provider's liability shall not exceed fifty percent of the total fees paid under this Agreement.

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information for a period of five years.

7. ADDITIONAL CLAUSE
Client agrees to provide exclusive access to all systems and data.

IN WITNESS WHEREOF, the parties have executed this Agreement.`
  }
};

export function createDemoFile(fileName: string, content: string): File {
  const blob = new Blob([content], { type: 'text/plain' });
  return new File([blob], fileName, { type: 'application/pdf' });
}
