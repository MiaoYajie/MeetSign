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
  DEFAULT_FAILURE_RESULT,
  DEFAULT_PANEL_CONFIG,
  DEFAULT_SUCCESS_RESULT,
  FONT_FAMILY_OPTIONS,
  ResultPanel,
  mergePanelConfig,
  renderTemplate,
  resolveResultPageStyle,
  type FieldDefinition,
  type PanelConfig,
  type ResultPanelConfig,
} from '@meetsign/form-kit';
import {
  Button,
  Card,
  ColorPicker,
  Divider,
  Input,
  Radio,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { useMemo, useState, type ReactNode } from 'react';
import type { EventDetail } from '../api/client';
import '../styles/checkin-preview.css';

type PreviewMode = 'form' | 'success' | 'failure';

interface Props {
  event: EventDetail;
  onSaveLayout: (items: EventDetail['formLayout']) => Promise<void>;
  onSaveConditions: (conditions: EventDetail['conditions']) => Promise<void>;
  onSavePanelConfig: (config: PanelConfig) => Promise<void>;
  onSaveResultConfig: (
    config: PanelConfig,
    successTemplate: string,
    failureTemplate: string
  ) => Promise<void>;
}

const SAMPLE_VALUES = {
  name: '张三',
  organization: '示例单位',
  seatNumber: 'A01',
};

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

function ResultConfigFields({
  config,
  template,
  onChangeConfig,
  onChangeTemplate,
}: {
  config: ResultPanelConfig;
  template: string;
  onChangeConfig: (patch: Partial<ResultPanelConfig>) => void;
  onChangeTemplate: (value: string) => void;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Typography.Text>面板标题</Typography.Text>
        <Input
          value={config.title}
          onChange={(e) => onChangeConfig({ title: e.target.value })}
          style={{ marginTop: 4 }}
        />
      </div>

      <div>
        <Typography.Text>标题颜色</Typography.Text>
        <div style={{ marginTop: 4 }}>
          <ColorPicker
            value={config.titleColor}
            onChange={(_, hex) => onChangeConfig({ titleColor: hex })}
            showText
          />
        </div>
      </div>

      <div>
        <Typography.Text>消息模板</Typography.Text>
        <Input.TextArea
          rows={4}
          value={template}
          onChange={(e) => onChangeTemplate(e.target.value)}
          placeholder={'欢迎 {{name}} 签到成功！\n座位：{{seatNumber}}'}
          style={{ marginTop: 4 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          支持 {'{{字段键}}'} 变量，换行会正常显示
        </Typography.Text>
      </div>

      <div>
        <Typography.Text>按钮文字</Typography.Text>
        <Input
          value={config.buttonText}
          onChange={(e) => onChangeConfig({ buttonText: e.target.value })}
          style={{ marginTop: 4 }}
        />
      </div>

      <div>
        <Typography.Text>按钮颜色</Typography.Text>
        <div style={{ marginTop: 4 }}>
          <ColorPicker
            value={config.buttonColor}
            onChange={(_, hex) => onChangeConfig({ buttonColor: hex })}
            showText
          />
        </div>
      </div>

      <div>
        <Typography.Text>按钮字体</Typography.Text>
        <Select
          style={{ width: '100%', marginTop: 4 }}
          value={config.buttonFontFamily}
          onChange={(value) => onChangeConfig({ buttonFontFamily: value })}
          options={FONT_FAMILY_OPTIONS}
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <Typography.Text>面板背景颜色</Typography.Text>
        <div style={{ marginTop: 4 }}>
          <ColorPicker
            value={config.panelBackgroundColor}
            onChange={(_, hex) => onChangeConfig({ panelBackgroundColor: hex })}
            showText
          />
        </div>
      </div>

      <div>
        <Typography.Text>
          面板透明度：{Math.round(config.panelBackgroundOpacity * 100)}%
        </Typography.Text>
        <Slider
          min={0}
          max={100}
          value={Math.round(config.panelBackgroundOpacity * 100)}
          onChange={(v) => onChangeConfig({ panelBackgroundOpacity: v / 100 })}
        />
      </div>

      <div>
        <Typography.Text>页面背景</Typography.Text>
        <Radio.Group
          style={{ marginTop: 8, display: 'block' }}
          value={config.useCheckInBackground ? 'checkin' : 'custom'}
          onChange={(e) =>
            onChangeConfig({ useCheckInBackground: e.target.value === 'checkin' })
          }
        >
          <Space direction="vertical">
            <Radio value="checkin">沿用签到背景</Radio>
            <Radio value="custom">自定义背景</Radio>
          </Space>
        </Radio.Group>
        {!config.useCheckInBackground && (
          <Input
            value={config.customPageBackground}
            onChange={(e) => onChangeConfig({ customPageBackground: e.target.value })}
            placeholder="如 #eef2ff 或 linear-gradient(...)"
            style={{ marginTop: 8 }}
          />
        )}
      </div>
    </Space>
  );
}

function FormConfigFields({
  panelConfig,
  onChange,
}: {
  panelConfig: PanelConfig;
  onChange: (patch: Partial<PanelConfig>) => void;
}) {
  return (
    <>
      <Typography.Title level={5}>布局设置</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Typography.Text>标题</Typography.Text>
          <Input
            value={panelConfig.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="留空则使用活动名称"
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Space style={{ marginBottom: 4 }}>
            <Typography.Text>固定欢迎语</Typography.Text>
            <Switch
              checked={panelConfig.showWelcomeMessage}
              onChange={(checked) => onChange({ showWelcomeMessage: checked })}
            />
          </Space>
          <Input.TextArea
            rows={2}
            disabled={!panelConfig.showWelcomeMessage}
            value={panelConfig.welcomeMessage}
            onChange={(e) => onChange({ welcomeMessage: e.target.value })}
          />
        </div>

        <div>
          <Typography.Text>签到按钮文字</Typography.Text>
          <Input
            value={panelConfig.submitButtonText}
            onChange={(e) => onChange({ submitButtonText: e.target.value })}
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
              onChange={(_, hex) => onChange({ panelBackgroundColor: hex })}
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
            onChange={(v) => onChange({ panelBackgroundOpacity: v / 100 })}
          />
        </div>

        <div>
          <Typography.Text>签到按钮颜色</Typography.Text>
          <div style={{ marginTop: 4 }}>
            <ColorPicker
              value={panelConfig.submitButtonColor}
              onChange={(_, hex) => onChange({ submitButtonColor: hex })}
              showText
            />
          </div>
        </div>
      </Space>
    </>
  );
}

export default function EventFormDesigner({
  event,
  onSaveLayout,
  onSaveConditions,
  onSavePanelConfig,
  onSaveResultConfig,
}: Props) {
  const fieldMap = useMemo(
    () => new Map(event.fields.map((f) => [f.key, f.label])),
    [event.fields]
  );

  const [previewMode, setPreviewMode] = useState<PreviewMode>('form');
  const [layout, setLayout] = useState(event.formLayout);
  const [conditions, setConditions] = useState(event.conditions);
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(
    mergePanelConfig(event.panelConfig ?? DEFAULT_PANEL_CONFIG)
  );
  const [successTemplate, setSuccessTemplate] = useState(event.successTemplate);
  const [failureTemplate, setFailureTemplate] = useState(event.failureTemplate);
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

  const updateSuccessResult = (patch: Partial<ResultPanelConfig>) => {
    setPanelConfig((prev) => ({
      ...prev,
      successResult: { ...prev.successResult, ...patch },
    }));
  };

  const updateFailureResult = (patch: Partial<ResultPanelConfig>) => {
    setPanelConfig((prev) => ({
      ...prev,
      failureResult: { ...prev.failureResult, ...patch },
    }));
  };

  const saveResultSettings = async () => {
    await onSaveResultConfig(panelConfig, successTemplate, failureTemplate);
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

  const previewMessage =
    previewMode === 'success'
      ? renderTemplate(successTemplate, SAMPLE_VALUES)
      : renderTemplate(failureTemplate, SAMPLE_VALUES);

  const activeResultConfig =
    previewMode === 'success' ? panelConfig.successResult : panelConfig.failureResult;

  const previewWrapStyle =
    previewMode === 'form'
      ? event.backgroundUrl
        ? { backgroundImage: `url(${event.backgroundUrl})` }
        : undefined
      : resolveResultPageStyle(activeResultConfig, event.backgroundUrl);

  let previewContent: ReactNode;
  if (previewMode === 'form') {
    previewContent = (
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
    );
  } else {
    previewContent = (
      <ResultPanel
        resultConfig={activeResultConfig}
        message={previewMessage || '（消息模板预览）'}
        logoUrl={event.logoUrl}
        footerHtml={event.footerHtml}
        defaults={previewMode === 'success' ? DEFAULT_SUCCESS_RESULT : DEFAULT_FAILURE_RESULT}
        preview
      />
    );
  }

  const configTitle =
    previewMode === 'form'
      ? '签到面板配置'
      : previewMode === 'success'
        ? '成功结果配置'
        : '失败结果配置';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <Segmented
        block
        value={previewMode}
        onChange={(value) => setPreviewMode(value as PreviewMode)}
        options={[
          { label: '签到表单', value: 'form' },
          { label: '成功结果', value: 'success' },
          { label: '失败结果', value: 'failure' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div
        className={`form-designer-layout${previewMode !== 'form' ? ' result-mode' : ''}`}
      >
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
            previewMode === 'form' ? (
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
            ) : null
          }
        >
          <div className="checkin-preview-wrap" style={previewWrapStyle}>
            {previewContent}
          </div>
        </Card>

        <Card title={configTitle} className="form-designer-config">
          {previewMode === 'form' && (
            <>
              <FormConfigFields panelConfig={panelConfig} onChange={updatePanel} />
              <Button
                type="primary"
                block
                style={{ marginTop: 16 }}
                onClick={() => onSavePanelConfig(panelConfig)}
              >
                保存签到面板配置
              </Button>
            </>
          )}

          {previewMode === 'success' && (
            <>
              <ResultConfigFields
                config={panelConfig.successResult}
                template={successTemplate}
                onChangeConfig={updateSuccessResult}
                onChangeTemplate={setSuccessTemplate}
              />
              <Button type="primary" block style={{ marginTop: 16 }} onClick={saveResultSettings}>
                保存成功结果配置
              </Button>
            </>
          )}

          {previewMode === 'failure' && (
            <>
              <ResultConfigFields
                config={panelConfig.failureResult}
                template={failureTemplate}
                onChangeConfig={updateFailureResult}
                onChangeTemplate={setFailureTemplate}
              />
              <Button type="primary" block style={{ marginTop: 16 }} onClick={saveResultSettings}>
                保存失败结果配置
              </Button>
            </>
          )}
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
