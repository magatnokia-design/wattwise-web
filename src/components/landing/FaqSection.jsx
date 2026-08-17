import { Link } from 'react-router-dom';
import { selectLandingFaq } from './faqTopics';
import styles from './FaqSection.module.css';

/**
 * The public FAQ, rendered from the Help Center itself. See faqTopics.js for
 * which questions are included and why the rest are not.
 *
 * Built on <details>/<summary> rather than useState: it opens and closes with
 * the keyboard, is exposed to screen readers as a disclosure without any aria
 * bookkeeping, survives a browser's in-page find, and prints expanded. A hand-
 * rolled accordion would have to earn all four back.
 *
 * The first is open so the section does not read as a wall of closed bars — a
 * visitor should be able to see what an answer looks like without clicking.
 */
export const FaqSection = () => {
  const topics = selectLandingFaq();

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {topics.map((topic, index) => (
          <li key={topic.id}>
            <details className={styles.item} open={index === 0}>
              <summary className={styles.summary}>
                <span className={styles.icon} aria-hidden="true">
                  {topic.icon}
                </span>
                <span className={styles.question}>{topic.question}</span>
                <span className={styles.chevron} aria-hidden="true" />
              </summary>

              <div className={styles.answer}>
                {topic.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {/* Deliberately not a link to /help — that route is inside the app shell,
          so a signed-out visitor clicking it would land on the sign-in form
          having asked for a help page. Stating where it lives is more use than
          a link that bounces. */}
      <p className={styles.more}>
        The app&rsquo;s Help Center answers more of these, including what to do when a
        reading looks wrong. It is under Help once you are signed in —{' '}
        <Link to="/login" className={styles.moreLink}>
          sign in
        </Link>{' '}
        if you already have an account.
      </p>
    </div>
  );
};

export default FaqSection;
