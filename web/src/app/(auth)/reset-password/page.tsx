import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

const ResetPasswordPage = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Atur ulang kata sandi</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
