import React from 'react';
import { Card, Button, Typography, Space, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

interface BulkAction {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

interface BulkActionBarProps {
    selectedCount: number;
    actions: BulkAction[];
    onClearSelection: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    actions,
    onClearSelection,
}) => {
    if (selectedCount === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                width: 'auto',
                minWidth: 400,
                maxWidth: '90vw',
            }}
        >
            <Card
                size="small"
                styles={{
                    body: {
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
                        borderRadius: 8
                    }
                }}
            >
                <Space size="middle">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Clear selection">
                            <Button
                                type="text"
                                icon={<CloseOutlined />}
                                onClick={onClearSelection}
                                size="small"
                                style={{ marginRight: 8 }}
                            />
                        </Tooltip>
                        <Typography.Text strong>
                            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                        </Typography.Text>
                    </div>
                    <div style={{ height: '24px', width: '1px', background: '#f0f0f0' }} />
                    <Space>
                        {actions.map((action) => (
                            <Button
                                key={action.key}
                                danger={action.danger}
                                type={action.type || (action.danger ? 'primary' : 'default')}
                                icon={action.icon}
                                onClick={action.onClick}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Space>
                </Space>
            </Card>
        </div>
    );
};

export default BulkActionBar;
