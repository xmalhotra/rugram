import { usePaneState } from './pane-state';
import { useToast } from './design/states';
import type { Dispatch, SetStateAction } from 'react';
import {
  pickUseCases,
  type CityEvent,
  type MobilePayload,
  type Product,
} from '../../shared/mobile';
import { curatedEventForm, curatedEventInput } from './EventLinkFields';
import { draftPurchaseOptions, primaryPurchase, readPurchaseDrafts } from '../../shared/purchases';
type Props = {
  data: MobilePayload | null;
  change: (body: unknown, success?: string) => Promise<boolean>;
  closePick: () => void;
  selectedProduct: Product | null;
  setSelectedEvent: Dispatch<SetStateAction<CityEvent | null>>;
};
export function useCreatorSubmit({
  data,
  change,
  closePick,
  selectedProduct,
  setSelectedEvent,
}: Props) {
  const toast = useToast();
  const [city, setCity] = usePaneState('draftCity', data?.profile.city ?? 'Hyderabad');
  const [editor, setEditor] = usePaneState<'product' | 'event' | 'endorse' | null>('editor', null);
  const [form, setForm] = usePaneState<Record<string, string>>('draft', {});
  const [editingEventId, setEditingEventId] = usePaneState<string | null>('editingEvent', null);
  const [editingProductId, setEditingProductId] = usePaneState<string | null>(
    'editingProduct',
    null,
  );
  async function submit() {
    if (!data) return;
    try {
      const body =
        editor === 'product'
          ? {
              action: 'product',
              requestId: form._requestId,
              product: {
                title: form.title ?? '',
                summary: form.summary ?? '',
                useCases: pickUseCases.filter(value => value === form.useCase),
                packLabel: form.packLabel ?? '',
                safetyNote: form.safetyNote ?? '',
                price: Number(form.price),
                category: form.category ?? 'Food',
                ...(form.category === 'Tech'
                  ? { subcategory: form.subcategory ?? 'Electronics' }
                  : {}),
                tier: form.tier ?? 'Essential',
                url: form.url ?? '',
                checkedAt: new Date().toISOString(),
              },
            }
          : editor === 'event'
            ? {
                action: 'event-link',
                requestId: form._requestId,
                event: {
                  title: form.title ?? '',
                  topic: form.topic ?? 'Tech',
                  country: (form.country ?? 'IN').toUpperCase(),
                  entryFee: form.entryFee?.trim() ? Number(form.entryFee) : null,
                  feeNote: form.feeNote ?? '',
                  registrationStatus: form.registrationStatus ?? 'Check provider',
                  registrationUrl: form.registrationUrl ?? '',
                  city: form.city ?? city,
                  venue: form.venue ?? '',
                  startsAt: new Date(form.startsAt ?? '').toISOString(),
                  description: form.description ?? '',
                },
              }
            : {
                action: 'endorse',
                id: selectedProduct?.id,
                sourceUrl: form.sourceUrl ?? '',
                disclosure: form.disclosure ?? '',
              };
      if (editor === 'product' && 'product' in body && body.product) {
        const purchaseOptions = draftPurchaseOptions(readPurchaseDrafts(form.purchaseOptions));
        Object.assign(body.product, {
          variantLabel: form.variantLabel ?? '',
          purchaseOptions,
          ...primaryPurchase(purchaseOptions),
        });
      }
      if (editor === 'event')
        Object.assign(body, {
          action: editingEventId ? 'event-update' : 'event-link',
          ...(editingEventId ? { id: editingEventId } : {}),
          event: (() => {
            const input = curatedEventInput(form);
            if (data.user.role === 'creator') {
              const { editorialPriority, ...submission } = input;
              void editorialPriority;
              return submission;
            }
            return input;
          })(),
        });
      if (
        editor === 'product' &&
        form.category === 'Equipment' &&
        'product' in body &&
        body.product
      )
        Object.assign(body.product, {
          equipmentType: form.equipmentType ?? 'lifting-belt',
          useCases: [form.equipmentType ?? 'lifting-belt'],
        });
      if (
        await change(
          data.user.role === 'creator' && (editingEventId || editingProductId)
            ? {
                action: 'submission-update',
                id: editingEventId ?? editingProductId,
                data: 'event' in body ? body.event : 'product' in body ? body.product : undefined,
              }
            : body,
          editingEventId
            ? 'Event details saved. Pending events still require publication from Admin.'
            : data.user.role === 'admin'
              ? 'Published to the app.'
              : editor === 'endorse'
                ? 'Your source and disclosure have been added.'
                : 'Submitted for admin review.',
        )
      ) {
        setEditor(null);
        setEditingEventId(null);
        setEditingProductId(null);
        closePick();
      }
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : 'Review the form and try again.',
        kind: 'error',
      });
    }
  }
  function startEventEditor(event?: CityEvent) {
    setEditingProductId(null);
    setCity('Hyderabad');
    setSelectedEvent(null);
    setEditingEventId(event?.id ?? null);
    setForm({
      ...curatedEventForm(event, data?.library?.settings),
      ...(!event ? { organizerName: data?.user.name ?? '' } : {}),
      _requestId: `curated-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    setEditor('event');
  }
  function startEditor(kind: 'product' | 'event' | 'endorse') {
    setEditingEventId(null);
    setEditingProductId(null);
    if (kind === 'event') {
      startEventEditor();
      return;
    }
    setForm(kind === 'product' ? { category: 'Food', tier: 'Essential' } : {});
    setForm(previous => ({
      ...previous,
      _requestId: `submission-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setEditor(kind);
  }

  function editSubmission(item: Product | CityEvent) {
    if ('city' in item) {
      startEventEditor(item);
      return;
    }
    setEditingEventId(null);
    setEditingProductId(item.id);
    setEditor('product');
    setForm({
      title: item.title,
      summary: item.summary,
      category: item.category,
      tier: item.tier,
      price: String(item.price),
      url: item.url,
      variantLabel: item.variantLabel ?? '',
      packLabel: item.packLabel ?? '',
      safetyNote: item.safetyNote ?? '',
      useCase: item.useCases?.[0] ?? '',
      subcategory: item.subcategory ?? '',
      equipmentType: item.equipmentType ?? '',
      purchaseOptions: JSON.stringify(item.purchaseOptions ?? []),
    });
  }
  return {
    editor,
    setEditor,
    form,
    setForm,
    editingEventId,
    setEditingEventId,
    submit,
    startEventEditor,
    startEditor,
    editSubmission,
  };
}
