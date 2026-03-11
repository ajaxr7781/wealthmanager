import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ArrowRightLeft, AlertCircle, CheckCircle2, Plus, Search, Loader2 } from 'lucide-react';
import { useMfSwitch } from '@/hooks/useMfSwitch';
import { useSchemeSearch } from '@/hooks/useMfSchemes';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/types/assets';

interface RecordSwitchDialogProps {
  mfAssets: Asset[];
  preselectedSourceId?: string;
  trigger?: React.ReactNode;
}

type Step = 'form' | 'confirm';

const NEW_FUND_VALUE = '__NEW_FUND__';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'reversed', label: 'Reversed' },
];

export function RecordSwitchDialog({ mfAssets, preselectedSourceId, trigger }: RecordSwitchDialogProps) {
  const switchMutation = useMfSwitch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [isCreating, setIsCreating] = useState(false);

  const [sourceId, setSourceId] = useState(preselectedSourceId || '');
  const [destId, setDestId] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [newFundFolio, setNewFundFolio] = useState('');
  const [selectedSchemeCode, setSelectedSchemeCode] = useState<number | null>(null);
  const [schemeSearchTerm, setSchemeSearchTerm] = useState('');
  const [schemePopoverOpen, setSchemePopoverOpen] = useState(false);
  const debouncedSearch = useDebounce(schemeSearchTerm, 300);
  const { data: schemeResults, isLoading: isSearching } = useSchemeSearch(debouncedSearch);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [switchUnits, setSwitchUnits] = useState('');
  const [switchAmount, setSwitchAmount] = useState('');
  const [sourceNav, setSourceNav] = useState('');
  const [destNav, setDestNav] = useState('');
  const [destUnits, setDestUnits] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('completed');

  const isNewFund = destId === NEW_FUND_VALUE;
  const sourceAsset = useMemo(() => mfAssets.find(a => a.id === sourceId), [mfAssets, sourceId]);
  const destAsset = useMemo(() => isNewFund ? null : mfAssets.find(a => a.id === destId), [mfAssets, destId, isNewFund]);

  const availableUnits = sourceAsset ? Number(sourceAsset.units_held) || 0 : 0;
  const parsedUnits = Number(switchUnits) || 0;
  const parsedAmount = Number(switchAmount) || 0;
  const parsedDestNav = Number(destNav) || 0;
  const parsedDestUnits = Number(destUnits) || 0;

  const computedAmount = useMemo(() => {
    const nav = Number(sourceNav) || 0;
    if (parsedUnits > 0 && nav > 0 && !switchAmount) {
      return parsedUnits * nav;
    }
    return parsedAmount;
  }, [parsedUnits, sourceNav, switchAmount, parsedAmount]);

  const computedDestUnits = useMemo(() => {
    if (parsedDestUnits > 0) return parsedDestUnits;
    if (parsedDestNav > 0 && computedAmount > 0) return computedAmount / parsedDestNav;
    return 0;
  }, [parsedDestUnits, parsedDestNav, computedAmount]);

  const destDisplayName = isNewFund ? newFundName : destAsset?.asset_name || '';

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!sourceId) errors.push('Select source fund');
    if (!destId) errors.push('Select destination fund');
    if (isNewFund && !newFundName.trim()) errors.push('Enter destination fund name');
    if (sourceId && destId && sourceId === destId) errors.push('Source and destination must be different');
    if (parsedUnits <= 0) errors.push('Enter switch units');
    if (parsedUnits > availableUnits + 0.0001) errors.push(`Only ${availableUnits.toFixed(4)} units available`);
    if (computedAmount <= 0) errors.push('Enter switch amount or source NAV');
    if (!txDate) errors.push('Enter transaction date');
    return errors;
  }, [sourceId, destId, isNewFund, newFundName, parsedUnits, availableUnits, computedAmount, txDate]);

  const isValid = validationErrors.length === 0;

  const fmtINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

  const resetForm = () => {
    setSourceId(preselectedSourceId || '');
    setDestId('');
    setNewFundName('');
    setNewFundFolio('');
    setSelectedSchemeCode(null);
    setSchemeSearchTerm('');
    setSchemePopoverOpen(false);
    setTxDate(new Date().toISOString().slice(0, 10));
    setSwitchUnits('');
    setSwitchAmount('');
    setSourceNav('');
    setDestNav('');
    setDestUnits('');
    setReferenceNo('');
    setRemarks('');
    setStatus('completed');
    setStep('form');
    setIsCreating(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsCreating(true);

    try {
      let actualDestId = destId;

      // Create new destination fund if needed
      if (isNewFund) {
        const sourceType = sourceAsset?.asset_type || 'mutual_fund';
        const { data: newAsset, error: createErr } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            asset_name: newFundName.trim(),
            asset_type: sourceType,
            asset_type_code: sourceAsset?.asset_type_code || 'mutual_fund',
            category_code: sourceAsset?.category_code || 'equity',
            currency: sourceAsset?.currency || 'INR',
            purchase_date: txDate,
            total_cost: 0,
            units_held: 0,
            quantity: 0,
            quantity_unit: 'units',
            nav_or_price: parsedDestNav || null,
            folio_no: newFundFolio || sourceAsset?.folio_no || null,
            instrument_name: newFundName.trim(),
            broker_platform: sourceAsset?.broker_platform || null,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        actualDestId = newAsset.id;
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      }

      await switchMutation.mutateAsync({
        sourceAssetId: sourceId,
        destinationAssetId: actualDestId,
        transactionDate: txDate,
        switchUnits: parsedUnits,
        switchAmount: computedAmount,
        sourceNav: Number(sourceNav) || undefined,
        destinationNav: parsedDestNav || undefined,
        destinationUnits: computedDestUnits || undefined,
        referenceNo: referenceNo || undefined,
        remarks: remarks || undefined,
        status: status as 'completed' | 'pending' | 'failed' | 'reversed',
      });
      setOpen(false);
      resetForm();
    } catch (e: any) {
      // Error is handled by the mutation's onError
    } finally {
      setIsCreating(false);
    }
  };

  const destOptions = mfAssets.filter(a => a.id !== sourceId);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Record Switch
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Record Fund Switch
          </DialogTitle>
          <DialogDescription>
            Transfer units from one mutual fund to another
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            {/* Source Fund */}
            <div className="space-y-2">
              <Label>Source Fund (Switch Out)</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue placeholder="Select source fund" /></SelectTrigger>
                <SelectContent>
                  {mfAssets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex flex-col">
                        <span className="text-sm">{a.asset_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {Number(a.units_held || 0).toFixed(4)} units
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceAsset && (
                <p className="text-xs text-muted-foreground">
                  Available: {availableUnits.toFixed(4)} units · NAV: ₹{Number(sourceAsset.nav_or_price || 0).toFixed(4)}
                </p>
              )}
            </div>

            {/* Destination Fund */}
            <div className="space-y-2">
              <Label>Destination Fund (Switch In)</Label>
              <Select value={destId} onValueChange={(v) => { setDestId(v); if (v !== NEW_FUND_VALUE) setNewFundName(''); }}>
                <SelectTrigger><SelectValue placeholder="Select destination fund" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_FUND_VALUE}>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">Create New Fund</span>
                    </div>
                  </SelectItem>
                  {destOptions.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex flex-col">
                        <span className="text-sm">{a.asset_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {Number(a.units_held || 0).toFixed(4)} units
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New fund - searchable scheme picker */}
              {isNewFund && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Search Scheme Master</Label>
                    <Popover open={schemePopoverOpen} onOpenChange={setSchemePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal h-auto min-h-9 text-left"
                        >
                          {newFundName ? (
                            <span className="text-sm truncate">{newFundName}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Search by scheme name...</span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="p-2">
                          <div className="flex items-center gap-2 border-b pb-2 mb-1">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              placeholder="Type at least 3 characters..."
                              value={schemeSearchTerm}
                              onChange={e => setSchemeSearchTerm(e.target.value)}
                              autoFocus
                            />
                            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {debouncedSearch.length < 3 ? (
                              <p className="text-xs text-muted-foreground p-2">Type at least 3 characters to search</p>
                            ) : isSearching ? (
                              <p className="text-xs text-muted-foreground p-2">Searching...</p>
                            ) : schemeResults && schemeResults.length > 0 ? (
                              schemeResults.map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors"
                                  onClick={() => {
                                    setNewFundName(s.scheme_name);
                                    setSelectedSchemeCode(s.scheme_code);
                                    setSchemePopoverOpen(false);
                                    setSchemeSearchTerm('');
                                  }}
                                >
                                  <div className="text-sm leading-tight">{s.scheme_name}</div>
                                  {s.fund_house && (
                                    <div className="text-xs text-muted-foreground">{s.fund_house}</div>
                                  )}
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground p-2">No schemes found</p>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedSchemeCode && (
                      <p className="text-xs text-muted-foreground">Scheme code: {selectedSchemeCode}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Or enter fund name manually</Label>
                    <Input
                      placeholder="e.g. Kotak Emerging Equity Fund - Direct Growth"
                      value={newFundName}
                      onChange={e => { setNewFundName(e.target.value); setSelectedSchemeCode(null); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Folio Number (optional)</Label>
                    <Input
                      placeholder="e.g. 12345678/90"
                      value={newFundFolio}
                      onChange={e => setNewFundFolio(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} required />
            </div>

            {/* Units & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Units to Switch</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100.0000"
                  value={switchUnits}
                  onChange={e => setSwitchUnits(e.target.value)}
                  min="0"
                  step="0.0001"
                />
                {sourceAsset && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => setSwitchUnits(availableUnits.toString())}
                  >
                    Switch All
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Switch Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Auto-calculated"
                  value={switchAmount}
                  onChange={e => setSwitchAmount(e.target.value)}
                  min="0"
                  step="0.0001"
                />
                {computedAmount > 0 && !switchAmount && (
                  <p className="text-xs text-muted-foreground">≈ {fmtINR(computedAmount)}</p>
                )}
              </div>
            </div>

            {/* NAVs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source NAV (optional)</Label>
                <Input
                  type="number"
                  placeholder={sourceAsset ? `Current: ₹${Number(sourceAsset.nav_or_price || 0).toFixed(4)}` : ''}
                  value={sourceNav}
                  onChange={e => setSourceNav(e.target.value)}
                  min="0"
                  step="0.0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination NAV (optional)</Label>
                <Input
                  type="number"
                  placeholder={destAsset ? `Current: ₹${Number(destAsset.nav_or_price || 0).toFixed(4)}` : ''}
                  value={destNav}
                  onChange={e => setDestNav(e.target.value)}
                  min="0"
                  step="0.0001"
                />
              </div>
            </div>

            {/* Destination Units override */}
            <div className="space-y-2">
              <Label>Destination Units (optional, auto-calculated from amount/NAV)</Label>
              <Input
                type="number"
                placeholder={computedDestUnits > 0 ? `≈ ${computedDestUnits.toFixed(4)}` : 'Enter if known'}
                value={destUnits}
                onChange={e => setDestUnits(e.target.value)}
                min="0"
                step="0.0001"
              />
            </div>

            {/* Reference & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reference / ARN (optional)</Label>
                <Input placeholder="e.g. SWT123456" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea placeholder="e.g. Switching from regular to direct plan" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm space-y-1">
                {validationErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => setStep('confirm')} className="w-full" disabled={!isValid}>
              Review Switch
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Confirmation Summary */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source Fund</span>
                <div className="text-right">
                  <p className="font-medium text-sm">{sourceAsset?.asset_name}</p>
                  <Badge variant="secondary" className="text-xs">Switch Out</Badge>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Destination Fund</span>
                <div className="text-right">
                  <p className="font-medium text-sm">{destDisplayName}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {isNewFund && <Badge variant="outline" className="text-xs">New</Badge>}
                    <Badge variant="default" className="text-xs">Switch In</Badge>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{txDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units Switched Out</span>
                  <span>{parsedUnits.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Switch Amount</span>
                  <span>{fmtINR(computedAmount)}</span>
                </div>
                {computedDestUnits > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units Switched In</span>
                    <span>{computedDestUnits.toFixed(4)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">{status}</Badge>
                </div>
                {referenceNo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span>{referenceNo}</span>
                  </div>
                )}
              </div>

              {parsedUnits >= availableUnits - 0.0001 && (
                <div className="bg-accent text-accent-foreground rounded p-2 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Full switch — all units will be moved from source fund
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={switchMutation.isPending || isCreating}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {switchMutation.isPending || isCreating ? 'Processing…' : 'Confirm Switch'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
