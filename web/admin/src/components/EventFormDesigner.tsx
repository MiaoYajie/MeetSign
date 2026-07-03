import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  CheckInPanel,
  DEFAULT_PANEL_CONFIG,
  mergePanelConfig,
  type FieldDefinition,
  type PanelConfig,
} from '@meetsign/form-kit';
import {
  Button,
  Card,
  ColorPicker,
  Divider,
  Input,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import type { EventDetail } from '../api/client';
import '../styles/checkin-preview.css';

interface Props {
  event: EventDetail;
  onSaveLayout: (items: EventDetail['formLayout']) => Promise<void>;
  onSaveConditions: (conditions: EventDetail['conditions']) => Promise<void>;
  onSavePanelConfig: (config: PanelConfig) => Promise<void>;
}

function DraggableField({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '8px 12px',
        border: '1px dashed #91caff',
        borderRadius: 8,
        background: isDragging ? '#e6f4ff' : '#fff',
        cursor: 'grab',
      }}
    >
      {label}
    </div>
  );
}

function PreviewFormSlot({
  row,
  fieldKey,
  label,
  onRemove,
}: {
  row: number;
  fieldKey: string;
  label: string;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${row}` });
  return (
    <div
      ref={setNodeRef}
      className="preview-form-slot"
      style={{ borderColor: isOver ? '#1677ff' : '#cbd5e1' }}
    >
      <span>{label || fieldKey || '拖拽字段到此处'}</span>
      {fieldKey && (
        <Button size="small" danger onClick={onRemove}>
          移除
        </Button>
      )}
    </div>
  );
}

export default function EventFormDesigner({
  event,
  onSaveLayout,
  onSaveConditions,
  onSavePanelConfig,
}: Props) {
  const fieldMap = useMemo(
    () => new Map(event.fields.map((f) => [f.key, f.label])),
    [event.fields]
  );

  const [layout, setLayout] = useState(event.formLayout);
  const [conditions, setConditions] = useState(event.conditions);
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(
    mergePanelConfig(event.panelConfig ?? DEFAULT_PANEL_CONFIG)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewValues] = useState<Record<string, string>>({});

  const sensors = useSensors(useSensor(PointerSensor));

  const usedKeys = new Set(layout.map((x) => x.fieldKey));
  const availableFields = event.fields.filter((f) => !usedKeys.has(f.key));

  const previewFields: FieldDefinition[] = event.fields.map((f) => ({
    key: f.key,
    label: f.label,
    fieldType: f.fieldType as FieldDefinition['fieldType'],
    required: f.required,
  }));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const fieldKey = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId?.startsWith('slot-')) {
      if (!layout.some((x) => x.fieldKey === fieldKey)) {
        setLayout([...layout, { fieldKey, row: layout.length, col: 0, colSpan: 12 }]);
      }
      return;
    }
    const row = Number(overId.replace('slot-', ''));
    setLayout((prev) => {
      const without = prev.filter((x) => x.fieldKey !== fieldKey);
      const next = [...without];
      next.splice(row, 0, { fieldKey, row, col: 0, colSpan: 12 });
      return next.map((item, index) => ({ ...item, row: index }));
    });
  };

  const upsertCondition = (targetFieldKey: string, conditionJson: string) => {
    setConditions((prev) => {
      const others = prev.filter((c) => c.targetFieldKey !== targetFieldKey);
      if (!conditionJson) return others;
      return [...others, { targetFieldKey, conditionJson }];
    });
  };

  const updatePanel = (patch: Partial<PanelConfig>) => {
    setPanelConfig((prev) => ({ ...prev, ...patch }));
  };

  const formPreview = (
    <div className="dynamic-form">
      {layout.length === 0 && (
        <PreviewFormSlot row={0} fieldKey="" label="拖拽字段到此处" onRemove={() => undefined} />
      )}
      {layout.map((item, index) => (
        <PreviewFormSlot
          key={item.fieldKey}
          row={index}
          fieldKey={item.fieldKey}
          label={fieldMap.get(item.fieldKey) ?? item.fieldKey}
          onRemove={() => setLayout(layout.filter((x) => x.fieldKey !== item.fieldKey))}
        />
      ))}
      <PreviewFormSlot
        row={layout.length}
        fieldKey=""
        label="拖拽到此处追加字段"
        onRemove={() => undefined}
      />
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="form-designer-layout">
        <Card title="字段池" className="form-designer-pool">
          <Space direction="vertical" style={{ width: '100%' }}>
            {availableFields.map((field) => (
              <DraggableField key={field.key} id={field.key} label={field.label} />
            ))}
            {availableFields.length === 0 && (
              <Typography.Text type="secondary">所有字段已添加到面板</Typography.Text>
            )}
          </Space>
        </Card>

        <Card
          title="面板预览"
          className="form-designer-preview"
          extra={
            <Space>
              <Button
                onClick={() =>
                  setLayout(
                    event.fields.map((f, index) => ({
                      fieldKey: f.key,
                      row: index,
                      col: 0,
                      colSpan: 12,
                    }))
                  )
                }
              >
                重置表单
              </Button>
              <Button type="primary" onClick={() => onSaveLayout(layout)}>
                保存布局
              </Button>
            </Space>
          }
        >
          <div
            className="checkin-preview-wrap"
            style={
              event.backgroundUrl
                ? { backgroundImage: `url(${event.backgroundUrl})` }
                : undefined
            }
          >
            <CheckInPanel
              eventName={event.name}
              panelConfig={panelConfig}
              logoUrl={event.logoUrl}
              fields={previewFields}
              layout={layout}
              visibleFieldKeys={layout.map((x) => x.fieldKey)}
              values={previewValues}
              onChange={() => undefined}
              preview
              formSlot={formPreview}
            />
          </div>
        </Card>

        <Card title="面板配置" className="form-designer-config">
          <Typography.Title level={5}>布局设置</Typography.Title>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Typography.Text>标题</Typography.Text>
              <Input
                value={panelConfig.title}
                onChange={(e) => updatePanel({ title: e.target.value })}
                placeholder={`默认：${event.name}`}
                style={{ marginTop: 4 }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                留空则使用活动名称
              </Typography.Text>
            </div>

            <div>
              <Space style={{ marginBottom: 4 }}>
                <Typography.Text>固定欢迎语</Typography.Text>
                <Switch
                  checked={panelConfig.showWelcomeMessage}
                  onChange={(checked) => updatePanel({ showWelcomeMessage: checked })}
                />
              </Space>
              <Input.TextArea
                rows={2}
                disabled={!panelConfig.showWelcomeMessage}
                value={panelConfig.welcomeMessage}
                onChange={(e) => updatePanel({ welcomeMessage: e.target.value })}
                placeholder="例如：欢迎参加本次活动，请填写信息后签到"
              />
            </div>

            <div>
              <Typography.Text>签到按钮文字</Typography.Text>
              <Input
                value={panelConfig.submitButtonText}
                onChange={(e) => updatePanel({ submitButtonText: e.target.value })}
                style={{ marginTop: 4 }}
              />
            </div>
          </Space>

          <Divider />

          <Typography.Title level={5}>样式设置</Typography.Title>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Typography.Text>面板背景颜色</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <ColorPicker
                  value={panelConfig.panelBackgroundColor}
                  onChange={(_, hex) => updatePanel({ panelBackgroundColor: hex })}
                  showText
                />
              </div>
            </div>

            <div>
              <Typography.Text>
                面板透明度：{Math.round(panelConfig.panelBackgroundOpacity * 100)}%
              </Typography.Text>
              <Slider
                min={0}
                max={100}
                value={Math.round(panelConfig.panelBackgroundOpacity * 100)}
                onChange={(v) => updatePanel({ panelBackgroundOpacity: v / 100 })}
              />
            </div>

            <div>
              <Typography.Text>签到按钮颜色</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <ColorPicker
                  value={panelConfig.submitButtonColor}
                  onChange={(_, hex) => updatePanel({ submitButtonColor: hex })}
                  showText
                />
              </div>
            </div>
          </Space>

          <Button
            type="primary"
            block
            style={{ marginTop: 16 }}
            onClick={() => onSavePanelConfig(panelConfig)}
          >
            保存面板配置
          </Button>
        </Card>
      </div>

      <Card title="条件展示规则" style={{ marginTop: 16 }}>
        <Table
          rowKey="targetFieldKey"
          pagination={false}
          dataSource={event.fields.map((f) => ({
            targetFieldKey: f.key,
            label: f.label,
            conditionJson:
              conditions.find((c) => c.targetFieldKey === f.key)?.conditionJson ?? '',
          }))}
          columns={[
            { title: '字段', dataIndex: 'label' },
            {
              title: '条件类型',
              render: (_, row) => (
                <Select
                  style={{ width: 220 }}
                  value={
                    row.conditionJson.includes('fieldDuplicate')
                      ? 'fieldDuplicate'
                      : row.conditionJson.includes('"never"')
                        ? 'never'
                        : 'always'
                  }
                  onChange={(type) => {
                    if (type === 'fieldDuplicate') {
                      upsertCondition(
                        row.targetFieldKey,
                        JSON.stringify({
                          type: 'fieldDuplicate',
                          sourceFieldKey: 'name',
                          scope: 'presetList',
                        })
                      );
                    } else if (type === 'never') {
                      upsertCondition(row.targetFieldKey, JSON.stringify({ type: 'never' }));
                    } else {
                      upsertCondition(row.targetFieldKey, JSON.stringify({ type: 'always' }));
                    }
                  }}
                  options={[
                    { value: 'always', label: '始终显示' },
                    {
                      value: 'fieldDuplicate',
                      label: '姓名重复时显示（预设名单）',
                    },
                    { value: 'never', label: '始终隐藏' },
                  ]}
                />
              ),
            },
            {
              title: '说明',
              render: (_, row) => (
                <Input
                  value={row.conditionJson}
                  onChange={(e) => upsertCondition(row.targetFieldKey, e.target.value)}
                />
              ),
            },
          ]}
        />
        <Button
          type="primary"
          style={{ marginTop: 12 }}
          onClick={() => onSaveConditions(conditions)}
        >
          保存条件规则
        </Button>
      </Card>

      <DragOverlay>
        {activeId ? (
          <DraggableField id={activeId} label={fieldMap.get(activeId) ?? activeId} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
