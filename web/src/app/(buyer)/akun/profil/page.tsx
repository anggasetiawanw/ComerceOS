import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BuyerProfileForm } from '@/features/account/components/buyer-profile-form';

const BuyerProfilePage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data diri</CardTitle>
        </CardHeader>
        <CardContent>
          <BuyerProfileForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerProfilePage;
