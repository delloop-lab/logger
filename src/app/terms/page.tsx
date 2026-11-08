import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Terms and Conditions, Logger',
  description: 'Terms governing your access to and use of Logger.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      updated="8 November 2026"
      intro={[
        'These Terms and Conditions govern your access to and use of Logger, available at https://logger-puce-nine.vercel.app/.',
        'Logger is operated by The Novita Group Pty Ltd, an Australian company based in Western Australia (referred to as "we", "us" or "our").',
        'By creating an account or using Logger, you agree to these Terms and Conditions. If you do not agree, please do not use the service.',
      ]}
      sections={[
        {
          title: 'About Logger',
          paragraphs: [
            'Logger is an online woodworking and workshop management tool designed to help hobbyist woodworkers, makers and DIY enthusiasts organise timber, manage offcuts, plan projects and make better use of available materials.',
            'Features may include timber inventory, project planning, cutting plans, storage management and other woodworking tools.',
            'Logger is continually being developed. Features, functionality and the appearance of the service may change over time.',
          ],
        },
        {
          title: 'Current pricing and future charges',
          paragraphs: [
            'Logger is free to use.',
            'We reserve the right to introduce charges for access to Logger in the future. This may include introducing a subscription, charging for continued access to the platform, introducing paid features or changing which features are available free of charge.',
            'If we decide to introduce charges, we will:',
          ],
          bullets: [
            'Give existing users reasonable advance notice, with a target of at least 30 days wherever reasonably practicable.',
            'Explain the proposed pricing, when it will take effect and what it means for existing users.',
            'Make clear which features or services will become subject to payment.',
            'Give users the opportunity to decide whether they wish to continue using Logger under the new pricing arrangements.',
          ],
          afterBullets: [
            'No user will automatically be enrolled in a paid subscription or charged simply because pricing is introduced. Where payment is required, users will be asked to actively accept the applicable pricing and payment terms before charges begin.',
            'If you do not wish to pay for Logger, you may choose to stop using the service. Where practicable, we will provide a reasonable opportunity to retrieve your stored information before paid access takes effect or free access is withdrawn.',
            'We do not promise that Logger will remain free, or that any current free features will remain free indefinitely.',
          ],
        },
        {
          title: 'Your account',
          paragraphs: [
            'Some Logger features require you to register for an account.',
            'You agree to:',
          ],
          bullets: [
            'Provide a valid email address.',
            'Keep your login details secure.',
            'Be responsible for activity carried out through your account.',
            'Notify us if you believe your account has been accessed without your permission.',
            'Provide accurate information when using the service.',
          ],
          afterBullets: [
            "You must not share your account in a way that compromises its security or use another person's account without permission.",
            'We reserve the right to suspend or terminate accounts where we reasonably believe these Terms have been breached, the service is being misused or account security is at risk.',
          ],
        },
        {
          title: 'Acceptable use',
          paragraphs: [
            'You agree to use Logger lawfully and responsibly.',
            'You must not:',
          ],
          bullets: [
            'Use Logger for unlawful purposes.',
            'Attempt to gain unauthorised access to the platform or its systems.',
            'Interfere with the operation, security or performance of Logger.',
            'Upload malicious code or harmful material.',
            'Copy, reverse engineer, resell or commercially exploit Logger without our written permission.',
            'Use the service in a way that could damage, disrupt or compromise it or other users.',
          ],
          afterBullets: [
            'We may restrict or suspend access where we reasonably believe misuse has occurred.',
          ],
        },
        {
          title: 'Your information and workshop data',
          paragraphs: [
            'You retain ownership of the information and material you enter, upload or create using Logger.',
            'This may include timber descriptions, dimensions, photographs, inventory records, project details and cutting requirements.',
            'You are responsible for ensuring that the information you enter is accurate and that you have the right to upload or use any material you provide.',
            'You give us permission to host, store, process and display your information as necessary to operate Logger and provide its features to you within your account. Public or shared display of projects is covered separately in the section on ownership and privacy of user projects.',
            'We will handle personal information in accordance with our Privacy Policy.',
            'We take reasonable steps to protect user information, but you should not treat Logger as your only record of important workshop or project information. We recommend keeping your own copies of anything you cannot afford to lose.',
          ],
        },
        {
          title: 'Ownership and privacy of user projects',
          paragraphs: [
            'Projects, designs, plans, measurements, descriptions, photographs and other content created or uploaded by users within Logger remain the property of the user who created or uploaded them, subject to any third-party rights.',
            'Projects are private by default.',
            'A project created by a user will not be made publicly visible or shared with other Logger users unless the user actively chooses to make it available for sharing.',
            'Logger may provide an optional sharing function that allows users to submit selected projects to the What Can I Build? section of the platform.',
            'If a user chooses to share a project:',
          ],
          bullets: [
            'The user gives Logger permission to display that project to other users within the What Can I Build? section.',
            'The user retains ownership of the project and its original content.',
            'The permission to display the project is limited to providing and operating the sharing feature.',
            'The user may withdraw permission and request that the shared project be removed from public display.',
            'The user remains responsible for ensuring that they have the rights to share any photographs, designs or other material included in the project.',
          ],
          afterBullets: [
            'Choosing to share a project does not transfer ownership or give other users the right to copy, reproduce, sell or commercially exploit that project.',
            "We will not make a user's private projects publicly available simply because they have been created or stored within Logger.",
            'We may use anonymised and aggregated information to improve Logger, provided it does not identify the user or disclose their private project content.',
          ],
        },
        {
          title: 'Cutting plans, measurements and workshop safety',
          paragraphs: [
            'Logger may generate cutting plans, layouts, measurements, material estimates and other woodworking suggestions.',
            'These are provided as planning aids only.',
            'Although we aim to make the information accurate and useful, we cannot guarantee that every plan, measurement, calculation or recommendation will be correct or suitable for your particular project.',
            'You are responsible for:',
          ],
          bullets: [
            'Checking all measurements before cutting.',
            'Allowing for saw blade kerf, material thickness, machining tolerances and other practical considerations.',
            'Checking the suitability and condition of your timber.',
            'Confirming that a proposed cutting sequence is practical for your equipment and workshop.',
            'Following the safety instructions for your tools and machinery.',
            'Using appropriate protective equipment and safe working practices.',
          ],
          afterBullets: [
            'Never rely solely on a Logger cutting plan or diagram when operating machinery or making a cut.',
            'You remain responsible for your own workshop decisions and for ensuring that all work is carried out safely.',
          ],
        },
        {
          title: 'Intellectual property',
          paragraphs: [
            'Logger, including its software, design, branding, logos, graphics, layout and original content, is owned by or licensed to The Novita Group Pty Ltd.',
            'You may use Logger for your own personal woodworking and workshop activities, subject to these Terms.',
            'You must not reproduce, distribute, modify, sell or commercially exploit Logger or any part of its underlying software without our written permission.',
            'Your own timber records, photographs, project information and other uploaded content remain yours.',
          ],
        },
        {
          title: 'Availability and development',
          paragraphs: [
            'Logger is a developing service. We may add, modify, improve, restrict or remove features from time to time.',
            'We aim to keep Logger available and operating reliably, but we do not guarantee uninterrupted access.',
            'The service may occasionally be unavailable because of maintenance, technical problems, upgrades, hosting issues or circumstances outside our control.',
            'We may temporarily suspend all or part of Logger where necessary for maintenance, security or operational reasons.',
            'We will endeavour to provide notice of planned significant interruptions where reasonably practicable.',
          ],
        },
        {
          title: 'Third-party services',
          paragraphs: [
            'Logger may rely on third-party services and providers to operate, including hosting, database, email, authentication and other technology services.',
            'We are not responsible for interruptions or failures caused by third-party providers or services outside our reasonable control.',
            'Your use of third-party services may also be subject to their own terms and conditions.',
          ],
        },
        {
          title: 'Limitation of liability',
          paragraphs: [
            'To the extent permitted by law, we are not liable for indirect or consequential loss, loss of profits, loss of business, loss of opportunity or loss of data arising from your use of Logger or inability to access the service.',
            'We do not guarantee that Logger will be error-free, uninterrupted or suitable for every woodworking project or workshop requirement.',
            'Nothing in these Terms excludes, restricts or modifies any consumer guarantee, right or remedy that cannot lawfully be excluded under applicable law, including the Australian Consumer Law.',
            'Where the law permits us to limit liability, our liability will be limited to the extent permitted by that law.',
          ],
        },
        {
          title: 'Suspending or closing your account',
          paragraphs: [
            'You may stop using Logger and request closure of your account at any time by contacting us.',
            'We may suspend or terminate your access if:',
          ],
          bullets: [
            'You seriously or repeatedly breach these Terms.',
            'Your use creates a security risk or threatens the operation of Logger.',
            'We are required to do so by law.',
            'We decide to discontinue the service.',
          ],
          afterBullets: [
            'Where reasonably practicable, we will provide notice before suspending or terminating an account, except where immediate action is necessary for security, legal or operational reasons.',
            'If Logger is discontinued, we will endeavour to provide reasonable notice and an opportunity to retrieve your information where practicable.',
            'Our Privacy Policy explains how personal information is handled when an account is closed.',
          ],
        },
        {
          title: 'Changes to these Terms',
          paragraphs: [
            'We may update these Terms from time to time to reflect changes to Logger, its features, pricing, business arrangements or legal requirements.',
            'Where changes are material, we will provide reasonable notice through Logger, by email or by another appropriate method.',
            'The updated Terms will include a revised date.',
            'If you continue to use Logger after the updated Terms take effect, your continued use will be subject to the revised Terms, to the extent permitted by law. If you do not agree with the changes, you should stop using Logger.',
          ],
        },
        {
          title: 'Privacy',
          paragraphs: [
            'Your use of Logger is also governed by our Privacy Policy, which explains what information we collect, how we use it, how it is stored and the choices available to you.',
            'You can find the Privacy Policy on the Logger website.',
          ],
        },
        {
          title: 'Governing law',
          paragraphs: [
            'These Terms are governed by the laws of Western Australia, Australia.',
            'You agree that any disputes relating to these Terms or your use of Logger will be subject to the jurisdiction of the courts of Western Australia, subject to any rights you may have under applicable consumer protection laws.',
          ],
        },
        {
          title: 'Contact us',
          paragraphs: [
            'If you have questions about these Terms, Logger or your account, please contact:',
            'The Novita Group Pty Ltd',
            'Email: loggerhelp@novitagroup.com',
            'Website: https://logger-puce-nine.vercel.app/',
          ],
        },
      ]}
      closing={[
        'By registering for or using Logger, you acknowledge that you have read and agree to these Terms and Conditions.',
      ]}
    />
  );
}
