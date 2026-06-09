import ProjetoForm from '@/components/forms/ProjetoForm';

export default async function EditarProjeto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjetoForm id={id} />;
}