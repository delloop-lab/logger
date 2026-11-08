import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy — Logger',
  description: 'How Logger collects, uses and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="8 November 2026"
      intro={[
        "At Logger, we respect your privacy. We believe using a woodworking tool shouldn't mean handing over lots of personal information.",
        'This policy explains what information we collect, how we use it and how we look after it.',
      ]}
      sections={[
        {
          title: 'Who we are',
          paragraphs: [
            'Logger is a woodworking application operated by The Novita Group Pty Ltd, an Australian company based in Western Australia.',
            'Website: https://logger-puce-nine.vercel.app',
            'For privacy-related questions or requests, contact: loggerhelp@novitagroup.com',
            'In this policy, "Logger", "we", "us" and "our" refer to The Novita Group Pty Ltd.',
          ],
        },
        {
          title: 'What information do we collect?',
          paragraphs: [
            'We aim to collect only the information needed to provide and improve Logger.',
            'Account information',
            'Currently, creating an account requires an email address. We use this address to verify your account and provide access to Logger.',
            'We do not currently require your name, postal address, telephone number or other personal profile details to register.',
            'Workshop information',
            'When using Logger, you may choose to enter information such as:',
          ],
          bullets: [
            'Timber species and dimensions.',
            'Individual boards and offcuts.',
            'Timber quantities and storage locations.',
            'Project details and cutting requirements.',
            'Photographs and other information you choose to add.',
          ],
          afterBullets: [
            "This information is used to provide Logger's workshop, inventory and cutting-planning features.",
            'Technical information',
            'Certain technical information may be processed to operate and protect Logger. This may include IP addresses, browser and device information, access logs and diagnostic information.',
          ],
        },
        {
          title: 'How we use your information',
          paragraphs: ['We use information to:'],
          bullets: [
            'Create and verify your account.',
            'Provide access to Logger.',
            'Store and retrieve your workshop information.',
            'Provide timber inventory and cutting-planning features.',
            'Maintain the security and reliability of the application.',
            'Identify and resolve technical problems.',
            'Improve Logger and develop new features.',
          ],
          afterBullets: [
            'We do not sell your personal information.',
            'We do not use your email address for unrelated marketing without an appropriate legal basis.',
          ],
        },
        {
          title: 'Future features and additional information',
          paragraphs: [
            'Logger is a developing application, and its features may change over time.',
            'In the future, we may introduce additional account information, such as your name, workshop profile, preferences or other details that help personalise your experience.',
            'If we introduce additional information requirements or new ways of using personal information, we will update this Privacy Policy to explain what information is collected and why.',
            'Where required, we will notify users and obtain consent before collecting or using information for a new purpose.',
            'We will aim to keep optional personal details optional wherever possible.',
          ],
        },
        {
          title: 'How we store and protect your information',
          paragraphs: [
            'We take reasonable technical and organisational measures to protect information held by Logger against unauthorised access, loss, misuse or disclosure.',
            'Information is stored using the infrastructure and service providers required to operate the application.',
            'Access to information is restricted to what is reasonably necessary to operate, maintain and support Logger.',
            'No online service can guarantee absolute security, but we take reasonable steps to protect the information entrusted to us.',
          ],
        },
        {
          title: 'Sharing information with third parties',
          paragraphs: [
            'We do not sell, rent or trade your personal information.',
            'We may use trusted third-party service providers to help operate Logger. These may include providers of:',
          ],
          bullets: [
            'Website hosting and application infrastructure.',
            'Database and data storage services.',
            'Email delivery and account verification.',
            'Security, maintenance and technical support.',
          ],
          afterBullets: [
            'These providers may process information on our behalf where necessary to provide their services.',
            'Some service providers may store or process information outside Australia. Where this occurs, we will take reasonable steps to ensure information is handled appropriately and protected.',
            'We may also disclose information where required by law or where necessary to protect the security and rights of Logger or its users.',
          ],
        },
        {
          title: 'Cookies and similar technologies',
          paragraphs: [
            'Logger may use essential cookies or similar technologies needed to operate the application, maintain sessions and support account security.',
            'If additional analytics or tracking technologies are introduced, this policy will be updated. Where required, we will ask for consent before using non-essential cookies.',
          ],
        },
        {
          title: 'How long we keep information',
          paragraphs: [
            'We retain account and workshop information for as long as necessary to provide the service and meet applicable legal obligations.',
            'If you request account deletion, we will take reasonable steps to delete your personal information and associated workshop data, subject to any information we are legally required to retain.',
            'Some technical records or backup copies may remain for a limited period as part of normal security and backup processes.',
          ],
        },
        {
          title: 'Your privacy rights',
          paragraphs: [
            'We respect your right to understand and have a say in how your personal information is handled.',
            'Depending on the privacy laws that apply to you, you may be entitled to:',
          ],
          bullets: [
            'Request access to personal information we hold about you.',
            'Ask us to correct inaccurate or incomplete information.',
            'Request deletion of personal information, where applicable.',
            'Withdraw consent where processing is based on consent.',
            'Raise a complaint about how your information has been handled.',
          ],
          afterBullets: [
            'Where the Australian Privacy Act 1988 applies to our handling of your information, we will deal with access and correction requests in accordance with the Australian Privacy Principles.',
            'To make a privacy request or raise a concern, contact us at: loggerhelp@novitagroup.com',
            'If you are not satisfied with our response and the Australian Privacy Act applies, you may be able to lodge a complaint with the Office of the Australian Information Commissioner (OAIC).',
            'Website: https://www.oaic.gov.au/',
          ],
        },
        {
          title: "Children's privacy",
          paragraphs: [
            'Logger is designed for adults and is not intended to collect personal information from children without appropriate authorisation.',
            'If we become aware that personal information has been collected from a child in circumstances where this is not permitted, we will take appropriate steps to address it.',
          ],
        },
        {
          title: 'Changes to this policy',
          paragraphs: [
            'As Logger develops, this Privacy Policy may need to change.',
            'We will publish the latest version on this page and update the revision date.',
            'Where changes materially affect how we collect, use or disclose personal information, we will take appropriate steps to notify users.',
          ],
        },
        {
          title: 'Contact us',
          paragraphs: [
            'If you have questions about this Privacy Policy, your personal information or how Logger handles your data, please contact:',
            'The Novita Group Pty Ltd',
            'Logger',
            'Western Australia, Australia',
            'Email: loggerhelp@novitagroup.com',
            'Website: https://logger-puce-nine.vercel.app',
          ],
        },
      ]}
      closing={['Thank you for using Logger.']}
    />
  );
}
