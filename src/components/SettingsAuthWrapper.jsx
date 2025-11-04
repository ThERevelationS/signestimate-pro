import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Unlock } from 'lucide-react';

export default function SettingsAuthWrapper({ children, correctPassword, onUnlock, user }) {
  const [password, setPassword] = useState('');
  const [isManuallyUnlocked, setIsManuallyUnlocked] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const isUnlocked = isAdmin || isManuallyUnlocked;

  useEffect(() => {
    // If user becomes an admin after component has mounted, unlock it.
    if (isAdmin && onUnlock) {
        onUnlock();
    }
  }, [isAdmin, onUnlock]);

  const handleUnlock = () => {
    if (password === correctPassword) {
      setIsManuallyUnlocked(true);
      setError('');
      if (onUnlock) onUnlock();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };
  
  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Lock className="w-5 h-5" />
          Settings Locked
        </CardTitle>
        <p className="text-amber-700">Please enter the password to make changes. Admins are automatically granted access.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter password"
              className="mt-1"
            />
          </div>
          <Button onClick={handleUnlock} className="bg-amber-600 hover:bg-amber-700">
            <Unlock className="w-4 h-4 mr-2" />
            Unlock
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="mt-4 p-4 border-t border-amber-200 opacity-60">
          <p className="text-sm text-amber-800 font-medium mb-2">Settings Preview:</p>
          <div className="pointer-events-none grayscale">
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}