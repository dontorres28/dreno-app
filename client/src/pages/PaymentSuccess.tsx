import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-6">{t('payment.booked')}</div>
        <h1 className="text-3xl font-bold mb-4">{t('payment.confirmed')}</h1>
        <p className="mb-8" style={{ color: 'var(--w60)' }}>
          {t('payment.roomReady')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard" className="btn-primary">
            {t('payment.goToDashboard')}
          </Link>
          <Link to="/coaches" className="btn-secondary">
            {t('payment.browseMore')}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
