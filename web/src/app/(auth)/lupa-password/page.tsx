import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

const ForgotPasswordPage = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Lupa kata sandi</CardTitle>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordPage;
