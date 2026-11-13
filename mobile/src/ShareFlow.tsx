import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { exercise } from '../../shared/exercises';
import type { FlowLevel } from '../../shared/flow-defaults';
import { reportReasons } from '../../shared/reports';
import { attachmentPlan, attachmentToTheirFlow, type FlowAttachment } from '../../shared/share-attachment';
import { predictBodyFlow } from '../../shared/predicted-body-flow';
import { BodyPicture } from './BodyMap';
import { FollowSheet } from './FollowSheet';
import { Banner, Button, Card, Chip, Field, ProgressSteps, Row, RowGroup, SectionHeader, Sheet, Skeleton } from './design/components';
import { ReasonLine } from './design/states';
import { Text } from './design/Text';
import { layout, space, useTheme } from './design/theme';
import { api } from './api';
import { shareAct, useShareYours, type SharePost, type ShareRemark } from './share';

function asLevel(level: string): FlowLevel {
  if (level === 'Intermediate' || level === 'Advanced') return level;
  return 'Beginner';
}

function figure(attachment: FlowAttachment, width: number) {
  const areas = predictBodyFlow(attachmentPlan(attachment), { level: asLevel(attachment.level) });
  return <BodyPicture areas={areas} width={width} />;
}

export function AttachmentCard({
  attachment,
  text,
  following,
  finished,
  onOpen,
  onFollow,
}: {
  attachment: FlowAttachment;
  text?: string;
  following?: number;
  finished?: number;
  onOpen?: () => void;
  onFollow?: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {text ? <Text variant="callout" style={{ color: C.text }}>{text}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${attachment.title}`} onPress={onOpen} disabled={!onOpen}>
        <View style={{ flexDirection: 'row', gap: space.ms, alignItems: 'center' }}>
          {figure(attachment, 96)}
          <View style={{ flex: 1, gap: space.xxs }}>
            <Text variant="headline" style={{ color: C.text }}>{attachment.title}</Text>
            <Text variant="subhead" style={{ color: C.muted }}>
              {attachment.styleName} · {attachment.level} · {attachment.minutes} min
            </Text>
            <Text variant="subhead" style={{ color: C.muted }}>
              {attachment.owner.name} · followed {attachment.followedFor}
            </Text>
            {following != null ? (
              <Text variant="footnote" style={{ color: C.muted }}>
                {following} following · {finished ?? 0} finished
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {onFollow ? <Button title="Follow" onPress={onFollow} /> : null}
    </View>
  );
}

function RemarkRow({
  remark,
  canDelete,
  onDelete,
}: {
  remark: ShareRemark;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.xs, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{remark.name}</Text>
      <Text variant="callout" style={{ color: C.text }}>{remark.text}</Text>
      {canDelete ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete remark by ${remark.name}`} onPress={onDelete}>
          <Text variant="subhead" style={{ color: C.danger, fontWeight: '600' }}>Delete</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ShareDetail({
  id,
  focusId,
  viewerId,
  onClose,
}: {
  id: string;
  focusId?: string | null;
  viewerId: string;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const [detail, setDetail] = useState<{ post: SharePost; remarks: ShareRemark[] } | null>(null);
  const [error, setError] = useState('');
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reportReasons)[number]>('Other');
  useEffect(() => {
    let live = true;
    api<{ post: SharePost; remarks: ShareRemark[] }>(`/api/mobile/shares?id=${encodeURIComponent(id)}`)
      .then(next => {
        if (live) setDetail(next);
      })
      .catch(cause => {
        if (live) setError(cause instanceof Error ? cause.message : 'Could not load.');
      });
    return () => {
      live = false;
    };
  }, [id]);
  const post = detail?.post;
  const owner = post?.attachment.owner.id === viewerId;
  async function send() {
    if (busy || !words.trim()) return;
    setBusy(true);
    setError('');
    try {
      const next = await shareAct({ action: 'remark', postId: id, text: words });
      setDetail(next);
      setWords('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(remarkId: string) {
    setError('');
    try {
      setDetail(await shareAct({ action: 'delete-remark', id: remarkId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try again.');
    }
  }
  async function report() {
    setBusy(true);
    try {
      await shareAct({ action: 'report', kind: 'post', itemId: id, reason, note: '' });
      setReportOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function block() {
    if (!post) return;
    setBusy(true);
    try {
      await shareAct({ action: 'block', userId: post.attachment.owner.id });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try again.');
      setBusy(false);
    }
  }
  async function accept() {
    setBusy(true);
    try {
      setDetail(await shareAct({ action: 'accept-update', postId: id }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title={post?.attachment.title ?? 'Flow'} presentation="modal" fullScreen onClose={onClose}>
      {!post ? (
        error ? <Text style={{ color: C.danger }}>{error}</Text> : <Skeleton shape="line" />
      ) : (
        <View style={{ gap: space.ms }}>
          <AttachmentCard attachment={post.attachment} text={post.text} following={post.following} finished={post.finished} />
          {post.viewer.update?.length ? (
            <View style={{ gap: space.sm }}>
              <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Update available</Text>
              {post.viewer.update.map(line => (
                <ReasonLine key={line}>{line}</ReasonLine>
              ))}
              <Button variant="secondary" title="Take update" onPress={() => void accept()} />
            </View>
          ) : null}
          <Text variant="headline" style={{ color: C.text }}>The flow</Text>
          {post.attachment.exercises.map(item => (
            <Text key={item.exerciseId} variant="callout" style={{ color: C.text }}>
              {exercise(item.exerciseId)?.name ?? 'Exercise'} · {item.sets} sets
              {item.repsMin != null ? ` · ${item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`} reps` : ''}
            </Text>
          ))}
          {post.attachment.items.map(item => (
            <Text key={item.itemId} variant="callout" style={{ color: C.text }}>
              {item.name} · {item.amount}
            </Text>
          ))}
          {post.attachment.kind === 'map-flow'
            ? post.attachment.days.map(day => (
                <Text key={day.name} variant="subhead" style={{ color: C.muted }}>
                  {day.name}
                  {day.exercises.length ? ` · ${day.exercises.length} exercises` : ''}
                </Text>
              ))
            : null}
          <Text variant="headline" style={{ color: C.text }}>Remarks</Text>
          {detail.remarks.map(remark => (
            <RemarkRow
              key={remark.id}
              remark={remark}
              canDelete={owner || remark.userId === viewerId}
              onDelete={() => void remove(remark.id)}
            />
          ))}
          <Field label="Remark" value={words} onChange={setWords} placeholder="A question, a thought, how it went" multiline maxLength={280} />
          <Button variant="secondary" title="Write" onPress={() => void send()} disabled={busy || !words.trim()} />
          {!post.viewer.own ? (
            <View style={{ gap: space.sm }}>
              <Button title="Follow" onPress={() => setFollowing(true)} />
              <Button title="Report" secondary onPress={() => setReportOpen(value => !value)} />
              {reportOpen ? (
                <View style={{ gap: space.sm }}>
                  <ReasonLine>Your name is not shown on the report.</ReasonLine>
                  {reportReasons.map(item => (
                    <Chip key={item} title={item} active={reason === item} onPress={() => setReason(item)} />
                  ))}
                  <Button title="Send report" secondary onPress={() => void report()} />
                </View>
              ) : null}
              <Button title="Block" secondary destructive onPress={() => void block()} />
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={{ color: C.danger }}>
              {error}
            </Text>
          ) : null}
          {following ? (
            <FollowSheet
              theirFlow={attachmentToTheirFlow(post.attachment)}
              focusId={focusId}
              postId={post.id}
              onClose={() => setFollowing(false)}
            />
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

/** Home → Yours. The only place a member starts a post. */
export function ShareSection() {
  const { colors: C } = useTheme();
  const { value, error, loading, reload } = useShareYours();
  const [chosen, setChosen] = useState<FlowAttachment | null>(null);
  const [source, setSource] = useState<{ kind: SharePost['attachment']['kind']; id: string } | null>(null);
  const [words, setWords] = useState('');
  const [step, setStep] = useState<'ask' | 'confirm' | 'result'>('ask');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [showAll, setShowAll] = useState(false);
  async function post() {
    if (!source || busy) return;
    setBusy(true);
    setProblem('');
    try {
      await shareAct({ action: 'post', kind: source.kind, sourceId: source.id, text: words });
      setStep('result');
      reload();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  const earned = value?.earned ?? [];
  const close = value?.close ?? [];
  const shownClose = showAll ? close : close.slice(0, 3);
  return (
    <View style={{ gap: layout.cards }}>
      <SectionHeader
        title="Share"
        detail={earned.length ? 'Ready to post, then the ones you are close to.' : 'Finish a flow and you can post it from here.'}
      />
      {loading && !value ? <Skeleton shape="block" /> : null}
      {error ? <Banner kind="error" message={error} action={{ label: 'Retry', onPress: () => reload() }} /> : null}
      {earned.length || close.length ? (
        <RowGroup>
          {earned.map(item => (
            <Row
              key={`${item.kind}:${item.id}`}
              title={item.title}
              detail={[item.detail, item.reason].filter(Boolean).join(' · ')}
              accessibilityLabel={`Share ${item.title}${item.detail ? `, ${item.detail}` : ''}`}
              onPress={() => {
                if (!item.attachment) return;
                setChosen(item.attachment);
                setSource({ kind: item.kind, id: item.id });
                setWords('');
                setStep('confirm');
                setProblem('');
              }}
            />
          ))}
          {shownClose.map(item => (
            <Row
              key={`${item.kind}:${item.id}`}
              title={item.title}
              accessibilityLabel={`${item.title}${item.detail ? `, ${item.detail}` : ''}. ${item.line ?? item.reason}`}
              detail={
                <View style={{ gap: space.sm }}>
                  <Text variant="subhead" style={{ color: C.muted }}>
                    {[item.detail, item.line ?? item.reason].filter(Boolean).join(' · ')}
                  </Text>
                  {item.kind !== 'map-flow' && item.need ? (
                    <ProgressSteps total={item.need} filled={item.done ?? 0} />
                  ) : null}
                </View>
              }
            />
          ))}
        </RowGroup>
      ) : null}
      {close.length > 3 ? (
        <Button
          variant="text"
          title={showAll ? 'Show fewer' : `Show all ${close.length}`}
          onPress={() => setShowAll(value => !value)}
        />
      ) : null}
      {chosen && step !== 'ask' ? (
        <Sheet
          title={step === 'result' ? 'Posted' : 'Share'}
          presentation="modal"
          onClose={() => {
            setChosen(null);
            setStep('ask');
          }}
        >
          {step === 'confirm' ? (
            <View style={{ gap: space.sm }}>
              <AttachmentCard attachment={chosen} />
              <ReasonLine>Weights and logs stay with you.</ReasonLine>
              <Field label="Words" value={words} onChange={setWords} placeholder="Add words if you want" multiline maxLength={280} />
              {problem ? (
                <Text accessibilityRole="alert" style={{ color: C.danger }}>
                  {problem}
                </Text>
              ) : null}
              <Button title="Post" onPress={() => void post()} disabled={busy} />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Text variant="body" style={{ color: C.text }}>
                {words.trim() ? `Posted with “${words.trim()}”.` : 'Posted.'} Others can follow it from the feed.
              </Text>
              <Button
                title="Done"
                onPress={() => {
                  setChosen(null);
                  setStep('ask');
                }}
              />
            </View>
          )}
        </Sheet>
      ) : null}
    </View>
  );
}
