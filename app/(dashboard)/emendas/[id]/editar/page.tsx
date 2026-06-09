import EmendaForm from '@/components/forms/EmendaForm';

export default async function EditarEmenda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmendaForm id={id} />;
}