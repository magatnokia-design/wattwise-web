import { ABOUT_SECTIONS, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../screens/Help/legalContent';
import { Card, CardHeader } from '../components/ui/Card';
import styles from './page.module.css';
import documentStyles from './DocumentPage.module.css';

/**
 * About, Privacy and Terms, from the same section data the phone renders.
 *
 * One component for all three because they are the same shape - a titled
 * document of prose and bullet lists - and three near-identical pages would be
 * three places to keep looking alike.
 */

const DOCUMENTS = {
  about: {
    title: 'About WattWise',
    lede: 'What WattWise is, what it does, and the limits it works within.',
    sections: ABOUT_SECTIONS,
  },
  privacy: {
    title: 'Privacy Policy',
    lede: 'What is stored, why, where it lives, and how to delete it.',
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Terms & Conditions',
    lede: 'What you are agreeing to when you use WattWise.',
    sections: TERMS_SECTIONS,
  },
};

export const DocumentPage = ({ document = 'about' }) => {
  const doc = DOCUMENTS[document] || DOCUMENTS.about;

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>{doc.lede}</p>
      </div>

      {doc.sections.map((section) => (
        <Card
          key={section.id}
          className={section.tone === 'warning' ? documentStyles.warning : undefined}
        >
          <CardHeader title={section.title} />

          <div className={documentStyles.body}>
            {(section.body || []).map((paragraph, index) => (
              <p key={`p${index}`}>{paragraph}</p>
            ))}

            {(section.bullets || []).length > 0 ? (
              <ul className={documentStyles.bullets}>
                {section.bullets.map((bullet, index) => (
                  <li key={`b${index}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DocumentPage;
