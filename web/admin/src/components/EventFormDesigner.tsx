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
import { Button, Card, Input, Select, Space, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import type { EventDetail } from '../api/client';

interface Props {
  event: EventDetail;
  onSaveLayout: (items: EventDetail['formLayout']) => Promise<void>;
  onSaveConditions: (conditions: EventDetail['conditions']) => Promise<void>;
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

function CanvasSlot({
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
      style={{
        minHeight: 56,
        border: `1px solid ${isOver ? '#1677ff' : '#d9d9d9'}`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{label || fieldKey}</span>
      <Button size="small" danger onClick={onRemove}>移除</Button>
    </div>
  );
}

export default function EventFormDesigner({ event, onSaveLayout, onSaveConditions }: Props) {
  const fieldMap = useMemo(
    () => new Map(event.fields.map((f) => [f.key, f.label])),
    [event.fields]
  );

  const [layout, setLayout] = useState(event.formLayout);
  const [conditions, setConditions] = useState(event.conditions);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const usedKeys = new Set(layout.map((x) => x.fieldKey));
  const availableFields = event.fields.filter((f) => !usedKeys.has(f.key));

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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <Space align="start" style={{ width: '100%' }} size="large">
        <Card title="字段池" style={{ width: 260 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {availableFields.map((field) => (
              <DraggableField key={field.key} id={field.key} label={field.label} />
            ))}
            {availableFields.length === 0 && <span>所有字段已添加到画布</span>}
          </Space>
        </Card>

        <Card
          title="表单画布"
          style={{ flex: 1 }}
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
                重置布局
              </Button>
              <Button type="primary" onClick={() => onSaveLayout(layout)}>保存布局</Button>
            </Space>
          }
        >
          {layout.length === 0 && (
            <CanvasSlot row={0} fieldKey="" label="拖拽字段到此处" onRemove={() => undefined} />
          )}
          {layout.map((item, index) => (
            <CanvasSlot
              key={item.fieldKey}
              row={index}
              fieldKey={item.fieldKey}
              label={fieldMap.get(item.fieldKey) ?? item.fieldKey}
              onRemove={() => setLayout(layout.filter((x) => x.fieldKey !== item.fieldKey))}
            />
          ))}
          <CanvasSlot
            row={layout.length}
            fieldKey=""
            label="拖拽到此处追加字段"
            onRemove={() => undefined}
          />
        </Card>
      </Space>

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
          onClick={async () => {
            await onSaveConditions(conditions);
            message.success('条件规则已保存');
          }}
        >
          保存条件规则
        </Button>
      </Card>

      <DragOverlay>
        {activeId ? <DraggableField id={activeId} label={fieldMap.get(activeId) ?? activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
