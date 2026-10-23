import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HELP_SECTIONS } from '../screens/Help/helpContent';
import { Card, CardHeader } from '../components/ui/Card';
import styles from './page.module.css';
import helpStyles from './HelpPage.module.css';
import { Icon } from '../components/ui/Icon';

// One icon per section, as the phone's HelpCenterScreen draws them. The shared
// helpContent.js keeps its emoji field; it is not read here any more.
const SECTION_ICONS = {
  bill: 'receipt-outline',
  appliances: 'pricetags-outline',
  measuring: 'speedometer-outline',
  scope: 'list-outline',
};

/**
 * Help Center.
 *
 * Content comes from the same `helpContent.js` the phone app renders, byte for
 * byte. Two clients answering the same question differently is worse than
 * either answer, and these are the answers a user checks when they are already
 * unsure whether to trust what they are reading.
 */
export const HelpPage = () => {
  // One open at a time, same as the phone. Two long answers open together
  // pushes the question you were reading off screen.
  const [openTopicId, setOpenTopicId] = useState(null);

  const toggle = (topicId) =>
    setOpenTopicId((current) => (current === topicId ? null : topicId));

  return (
    <div className={styles.page}>
      {HELP_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader
            title={(
              <span className={helpStyles.sectionTitle}>
                <Icon name={SECTION_ICONS[section.id] || 'help-circle-outline'} />
                {section.title}
              </span>
            )}
          />

          <ul className={helpStyles.topics}>
            {section.topics.map((topic) => {
              const expanded = openTopicId === topic.id;

              return (
                <li key={topic.id} className={helpStyles.topic}>
                  <button
                    type="button"
                    className={helpStyles.question}
                    onClick={() => toggle(topic.id)}
                    aria-expanded={expanded}
                  >
                    <span>{topic.question}</span>
                    <span className={helpStyles.chevron} aria-hidden="true">
                      {expanded ? '▾' : '▸'}
                    </span>
                  </button>

                  {expanded ? (
                    <div className={helpStyles.answer}>
                      {topic.answer.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      <p className={helpStyles.footer}>
        <Link to="/about">About Dagitab</Link> ·{' '}
        <Link to="/privacy">Privacy Policy</Link> ·{' '}
        <Link to="/terms">Terms &amp; Conditions</Link> ·{' '}
        <a href="mailto:support@dagitab.site">support@dagitab.site</a>
      </p>
    </div>
  );
};

export default HelpPage;
