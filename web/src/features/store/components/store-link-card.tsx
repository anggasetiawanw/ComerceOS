import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyableText } from '@/components/data/copyable-text';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const StoreLinkCard = ({ username }: { username: string }) => {
  const url = `${SITE_URL}/@${username}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Link toko kamu</CardTitle>
      </CardHeader>
      <CardContent>
        <CopyableText value={url} />
      </CardContent>
    </Card>
  );
};
