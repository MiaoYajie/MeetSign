import {
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Tabs,
  Upload,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eventsApi, type EventDetail, type FieldDefinition } from '../api/client';
import EventFormDesigner from '../components/EventFormDesigner';

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await eventsApi.get(id);
      setEvent(data);
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        checkInMode: data.checkInMode,
        footerHtml: data.footerHtml,
        successTemplate: data.successTemplate,
        failureTemplate: data.failureTemplate,
      });
    } catch {
      message.error('加载活动失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveBasic = async () => {
    if (!id) return;
    const values = await form.validateFields(['name', 'description']);
    await eventsApi.update(id, values.name, values.description);
    message.success('基本信息已保存');
    load();
  };

  const saveMode = async () => {
    if (!id) return;
    try {
      const checkInMode = form.getFieldValue('checkInMode');
      await eventsApi.updateMode(id, checkInMode);
      message.success('签到模式已保存');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败';
      message.error(msg);
    }
  };

  const saveTemplates = async () => {
    if (!id) return;
    const successTemplate = form.getFieldValue('successTemplate');
    const failureTemplate = form.getFieldValue('failureTemplate');
    await eventsApi.updateTemplates(id, successTemplate, failureTemplate);
    message.success('消息模板已保存');
    load();
  };

  const saveBranding = async () => {
    if (!id) return;
    const formData = new FormData();
    formData.append('footerHtml', form.getFieldValue('footerHtml') ?? '');
    const bg = form.getFieldValue('background')?.[0]?.originFileObj;
    const logo = form.getFieldValue('logo')?.[0]?.originFileObj;
    if (bg) formData.append('background', bg);
    if (logo) formData.append('logo', logo);
    await eventsApi.updateBranding(id, formData);
    message.success('品牌设置已保存');
    load();
  };

  const saveFields = async (fields: FieldDefinition[]) => {
    if (!id) return;
    await eventsApi.updateFields(id, fields);
    message.success('字段已保存');
    load();
  };

  const saveConditions = async (conditions: EventDetail['conditions']) => {
    if (!id) return;
    await eventsApi.updateConditions(id, conditions);
    message.success('条件规则已保存');
    load();
  };

  const deleteEvent = async () => {
    if (!id) return;
    await eventsApi.delete(id);
    message.success('已删除');
    navigate('/events');
  };

  if (!event) return <Card loading={loading}>加载中...</Card>;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title={`编辑活动：${event.name}`} extra={<Link to="/events">返回列表</Link>}>
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Form form={form} layout="vertical">
                  <Form.Item name="name" label="活动名称" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Button type="primary" onClick={saveBasic}>保存</Button>
                </Form>
              ),
            },
            {
              key: 'mode',
              label: '签到模式',
              children: (
                <Form form={form} layout="vertical">
                  <Form.Item name="checkInMode" label="模式">
                    <Radio.Group>
                      <Radio value="PresetList">预设名单（需导入名单并匹配）</Radio>
                      <Radio value="FreeForm">自由签到（自动收集数据）</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Button type="primary" onClick={saveMode}>保存</Button>
                </Form>
              ),
            },
            {
              key: 'branding',
              label: '品牌设置',
              children: (
                <Form form={form} layout="vertical">
                  {event.backgroundUrl && <img src={event.backgroundUrl} alt="背景" style={{ maxWidth: 320, marginBottom: 12 }} />}
                  <Form.Item name="background" label="背景图" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                    <Upload beforeUpload={() => false} maxCount={1} listType="picture">
                      <Button>上传背景图</Button>
                    </Upload>
                  </Form.Item>
                  {event.logoUrl && <img src={event.logoUrl} alt="Logo" style={{ maxWidth: 160, marginBottom: 12 }} />}
                  <Form.Item name="logo" label="Logo" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                    <Upload beforeUpload={() => false} maxCount={1} listType="picture">
                      <Button>上传 Logo</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item name="footerHtml" label="页脚 HTML">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Button type="primary" onClick={saveBranding}>保存</Button>
                </Form>
              ),
            },
            {
              key: 'fields',
              label: '名单字段',
              children: <FieldsEditor fields={event.fields} onSave={saveFields} />,
            },
            {
              key: 'designer',
              label: '表单设计',
              children: (
                <EventFormDesigner
                  event={event}
                  onSaveLayout={async (items) => {
                    if (!id) return;
                    await eventsApi.updateFormLayout(id, items);
                    message.success('布局已保存');
                    load();
                  }}
                  onSaveConditions={saveConditions}
                />
              ),
            },
            {
              key: 'templates',
              label: '结果消息',
              children: (
                <Form form={form} layout="vertical">
                  <Form.Item name="successTemplate" label="成功消息模板">
                    <Input.TextArea rows={3} placeholder="欢迎 {{name}} 签到成功！座位：{{seatNumber}}" />
                  </Form.Item>
                  <Form.Item name="failureTemplate" label="失败消息模板">
                    <Input.TextArea rows={3} placeholder="签到失败，请核对 {{name}} 信息。" />
                  </Form.Item>
                  <Button type="primary" onClick={saveTemplates}>保存</Button>
                </Form>
              ),
            },
          ]}
        />
        <div style={{ marginTop: 24 }}>
          <Button danger onClick={deleteEvent}>删除活动</Button>
        </div>
      </Card>
    </Space>
  );
}

function FieldsEditor({
  fields,
  onSave,
}: {
  fields: FieldDefinition[];
  onSave: (fields: FieldDefinition[]) => Promise<void>;
}) {
  const [items, setItems] = useState(fields);

  useEffect(() => setItems(fields), [fields]);

  const addField = () => {
    setItems([
      ...items,
      {
        key: `field_${Date.now()}`,
        label: '自定义字段',
        fieldType: 'Text',
        isBuiltIn: false,
        required: false,
        sortOrder: items.length,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<FieldDefinition>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items[index].isBuiltIn) {
      message.warning('内置字段不可删除');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {items.map((item, index) => (
        <Card key={item.key} size="small">
          <Space wrap>
            <Input
              value={item.label}
              onChange={(e) => updateItem(index, { label: e.target.value })}
              placeholder="显示名称"
            />
            <Input
              value={item.key}
              disabled={item.isBuiltIn}
              onChange={(e) => updateItem(index, { key: e.target.value })}
              placeholder="字段键"
            />
            <Select
              value={item.fieldType}
              style={{ width: 120 }}
              onChange={(v) => updateItem(index, { fieldType: v })}
              options={[
                { value: 'Text', label: '文本' },
                { value: 'Number', label: '数字' },
              ]}
            />
            <Radio.Group
              value={item.required}
              onChange={(e) => updateItem(index, { required: e.target.value })}
            >
              <Radio value={true}>必填</Radio>
              <Radio value={false}>选填</Radio>
            </Radio.Group>
            {!item.isBuiltIn && <Button danger onClick={() => removeItem(index)}>删除</Button>}
          </Space>
        </Card>
      ))}
      <Space>
        <Button onClick={addField}>新增自定义字段</Button>
        <Button type="primary" onClick={() => onSave(items.map((f, i) => ({ ...f, sortOrder: i })))}>
          保存字段
        </Button>
      </Space>
    </Space>
  );
}
