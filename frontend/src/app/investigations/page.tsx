'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvestigationsView from './InvestigationsView';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

function InvestigationsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <InvestigationsView initialId={id} />;
}

export default function InvestigationsPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoadingSpinner label="Loading workspace..." /></div>}>
      <InvestigationsContent />
    </Suspense>
  );
}
