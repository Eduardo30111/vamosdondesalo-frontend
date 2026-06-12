import MesaClient from './MesaClient';

export function generateStaticParams() {
  return [{ token: 'default' }];
}

export default function MesaPage() {
  return <MesaClient />;
}
