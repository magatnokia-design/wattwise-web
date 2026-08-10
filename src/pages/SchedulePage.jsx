import { useEffect, useState } from 'react';
import { useSchedule } from '../screens/Timer/hooks/useSchedule';
import {
  formatDays,
  formatOutletName,
  formatScheduledTime,
  getLiveCountdownDisplay,
  getNextScheduledRunSeconds,
  formatDuration,
} from '../screens/Timer/utils/scheduleHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { TextField, SelectField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import scheduleStyles from './SchedulePage.module.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY_FORM = {
  type: 'scheduled',
  outlet: '1',
  action: 'ON',
  scheduledTime: '18:00',
  hours: '0',
  minutes: '30',
  seconds: '0',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

const pad = (value) => String(Math.max(0, parseInt(value, 10) || 0)).padStart(2, '0');

export const SchedulePage = () => {
  const { schedules, loading, error, addSchedule, deleteSchedule, toggleSchedule } = useSchedule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [now, setNow] = useState(Date.now());

  // Countdowns are stored as a start time plus a duration, so the remaining
  // figure is derived, not stored — it only moves if something re-renders.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const update = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const toggleDay = (day) =>
    setForm((previous) => ({
      ...previous,
      days: previous.days.includes(day)
        ? previous.days.filter((entry) => entry !== day)
        : [...previous.days, day],
    }));

  const handleSave = async () => {
    setFormError('');

    const isCountdown = form.type === 'countdown';
    const countdownTime = `${pad(form.hours)}:${pad(form.minutes)}:${pad(form.seconds)}`;

    if (isCountdown && countdownTime === '00:00:00') {
      setFormError('Set a countdown longer than zero.');
      return;
    }

    if (!isCountdown && form.days.length === 0) {
      setFormError('Pick at least one day.');
      return;
    }

    setSaving(true);
    const result = await addSchedule({
      type: form.type,
      outlet: form.outlet,
      action: form.action,
      active: true,
      days: isCountdown ? [] : form.days,
      countdownTime: isCountdown ? countdownTime : null,
      scheduledTime: isCountdown ? null : form.scheduledTime,
    });
    setSaving(false);

    if (!result.success) {
      setFormError(result.error || 'Could not save the schedule.');
      return;
    }

    setForm(EMPTY_FORM);
    setOpen(false);
  };

  const describeNextRun = (schedule) => {
    if (schedule.type === 'countdown') {
      return `${getLiveCountdownDisplay(schedule, now)} remaining`;
    }

    const seconds = getNextScheduledRunSeconds(schedule.scheduledTime, schedule.days, now);
    if (seconds === null) return 'Not scheduled';
    return `in ${formatDuration(seconds)}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          Timers run on the server, not in this tab — closing the browser does not stop them. The
          ESP32 picks up the switch on its next poll.
        </p>
        <Button onClick={() => setOpen(true)}>Add timer</Button>
      </div>

      {error ? <Banner tone="alert">{error}</Banner> : null}

      <Card>
        <CardHeader title="Timers" subtitle={`${schedules.length} configured`} />

        {loading && !schedules.length ? (
          <Spinner label="Loading timers" />
        ) : schedules.length === 0 ? (
          <EmptyState icon="⏱️" title="No timers yet">
            Add a countdown to switch an outlet off after a set time, or a weekly schedule to run it
            at the same hour each day.
          </EmptyState>
        ) : (
          <ul className={scheduleStyles.list}>
            {schedules.map((schedule) => (
              <li key={schedule.id} className={scheduleStyles.item}>
                <div className={scheduleStyles.itemMain}>
                  <div className={scheduleStyles.itemHead}>
                    <Badge tone={schedule.action === 'ON' ? 'good' : 'neutral'}>
                      Turn {schedule.action}
                    </Badge>
                    <strong>{formatOutletName(schedule.outlet)}</strong>
                    <Badge tone="info">
                      {schedule.type === 'countdown' ? 'Countdown' : 'Weekly'}
                    </Badge>
                  </div>

                  <p className={scheduleStyles.itemDetail}>
                    {schedule.type === 'countdown'
                      ? `Runs once · ${getLiveCountdownDisplay(schedule, now)}`
                      : `${formatScheduledTime(schedule.scheduledTime)} · ${formatDays(
                          schedule.days
                        )}`}
                  </p>

                  <p className={scheduleStyles.itemNext}>
                    {schedule.active ? describeNextRun(schedule) : 'Paused'}
                  </p>
                </div>

                <div className={scheduleStyles.itemActions}>
                  <Switch
                    size="sm"
                    checked={schedule.active}
                    onChange={(next) => toggleSchedule(schedule.id, next)}
                    label={`Enable timer for outlet ${schedule.outlet}`}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add timer"
        width={520}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              Save timer
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {formError ? <Banner tone="alert">{formError}</Banner> : null}

          <div className={styles.formGrid}>
            <SelectField
              label="Type"
              value={form.type}
              onChange={update('type')}
              options={[
                { value: 'scheduled', label: 'Weekly schedule' },
                { value: 'countdown', label: 'One-off countdown' },
              ]}
            />
            <SelectField
              label="Outlet"
              value={form.outlet}
              onChange={update('outlet')}
              options={[
                { value: '1', label: 'Outlet 1' },
                { value: '2', label: 'Outlet 2' },
              ]}
            />
            <SelectField
              label="Action"
              value={form.action}
              onChange={update('action')}
              options={[
                { value: 'ON', label: 'Turn ON' },
                { value: 'OFF', label: 'Turn OFF' },
              ]}
            />
          </div>

          {form.type === 'countdown' ? (
            <div className={styles.formGrid}>
              <TextField
                label="Hours"
                type="number"
                min="0"
                max="23"
                value={form.hours}
                onChange={update('hours')}
              />
              <TextField
                label="Minutes"
                type="number"
                min="0"
                max="59"
                value={form.minutes}
                onChange={update('minutes')}
              />
              <TextField
                label="Seconds"
                type="number"
                min="0"
                max="59"
                value={form.seconds}
                onChange={update('seconds')}
              />
            </div>
          ) : (
            <>
              <TextField
                label="Time"
                type="time"
                value={form.scheduledTime}
                onChange={update('scheduledTime')}
              />
              <div>
                <p className={scheduleStyles.dayLabel}>Repeat on</p>
                <div className={scheduleStyles.days}>
                  {DAY_LABELS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={form.days.includes(day)}
                      className={`${scheduleStyles.day} ${
                        form.days.includes(day) ? scheduleStyles.dayOn : ''
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SchedulePage;
