'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InvestigationsView from '../InvestigationsView';

export default function InvestigationDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

  return <InvestigationsView initialId={id} />;
}
