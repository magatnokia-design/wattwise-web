import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Feedback';

export const NotFoundPage = () => (
  <Card>
    <EmptyState icon="🧭" title="That page does not exist">
      Check the address, or head back to the <Link to="/">dashboard</Link>.
    </EmptyState>
  </Card>
);

export default NotFoundPage;
