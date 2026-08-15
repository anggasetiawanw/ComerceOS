import { InquiryList } from '@/features/inquiries/components/inquiry-list';

const InquiriesPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pertanyaan</h1>
        <p className="text-sm text-muted-foreground">Pertanyaan dari tombol Tanya via WA di storefront kamu.</p>
      </div>
      <InquiryList />
    </div>
  );
};

export default InquiriesPage;
