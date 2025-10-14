// src/components/FlowStepNode.jsx
import React, 'react';
import { Handle, Position } from 'reactflow';
import { Card, Badge, ButtonGroup, Button } from 'react-bootstrap';
import { Pencil, Trash } from 'react-bootstrap-icons';

const getStepTypeStyle = (type) => {
    const styles = {
        'MESSAGE': { variant: 'light', label: 'Mensagem' },
        'QUESTION_TEXT': { variant: 'info', label: 'Pergunta (Texto)' },
        'QUESTION_POLL': { variant: 'primary', label: 'Pergunta (Enquete)' },
        'FORM_SUBMIT': { variant: 'success', label: 'Enviar Formulário' },
        'END_FLOW': { variant: 'dark', label: 'Finalizar Fluxo' },
        'REQUEST_HUMAN_SUPPORT': { variant: 'warning', label: 'Atendimento Humano' },
        'LIST_CHATS': { variant: 'secondary', label: 'Listar Atendimentos' },
        'ASSIGN_CHAT': { variant: 'danger', label: '[AÇÃO] Assumir' },
        'ENTER_CONVERSATION_MODE': { variant: 'danger', label: '[AÇÃO] Modo Conversa' },
        'CLOSE_CHAT': { variant: 'danger', label: '[AÇÃO] Encerrar' },
    };
    return styles[type] || { variant: 'light', label: type };
};

function FlowStepNode({ data }) {
    const { step, stepIndex, onEdit, onDelete } = data;
    const style = getStepTypeStyle(step.step_type);

    const isSource = step.step_type === 'MESSAGE' || step.step_type === 'QUESTION_TEXT' || step.step_type === 'QUESTION_POLL';
    const isTarget = true; // Todas as etapas podem ser um alvo

    return (
        <>
            {isTarget && <Handle type="target" position={Position.Top} id="in" />}

            <Card border={step.isInitial ? 'primary' : ''} style={{ width: '280px', borderWidth: step.isInitial ? '2px' : '1px' }}>
                <Card.Header className="d-flex justify-content-between align-items-center p-2">
                    <div className="fw-bold">
                        Etapa {stepIndex}
                        {step.isInitial && <Badge bg="primary" className="ms-2">Inicial</Badge>}
                    </div>
                    <ButtonGroup size="sm">
                        <Button variant="outline-secondary" onClick={() => onEdit(step)}><Pencil size={12} /></Button>
                        <Button variant="outline-danger" onClick={() => onDelete(step.id)}><Trash size={12} /></Button>
                    </ButtonGroup>
                </Card.Header>
                <Card.Body className="p-2">
                    <Badge bg={style.variant} text={style.variant === 'light' || style.variant === 'warning' ? 'dark' : 'white'} className="mb-2">{style.label}</Badge>
                    <Card.Text style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.message_body || '(Etapa sem mensagem de texto)'}
                    </Card.Text>
                </Card.Body>
            </Card>

            {/* Handle de Saída Padrão (sucesso) */}
            {(step.step_type === 'MESSAGE' || step.step_type === 'QUESTION_TEXT') && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="next_step_id"
                    style={{ background: '#5cb85c' }}
                />
            )}

            {/* Handle de Saída para Falha (em consultas DB) */}
            {step.step_type === 'QUESTION_TEXT' && step.db_query && (
                 <>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="next_step_id_on_fail"
                        style={{ top: '50%', background: '#d9534f' }}
                    />
                    <div style={{ position: 'absolute', right: -60, top: '45%', fontSize: '10px', color: '#d9534f' }}>Falha DB</div>
                 </>
            )}

            {/* Handles de Saída para Opções de Enquete */}
            {step.step_type === 'QUESTION_POLL' && step.poll_options && step.poll_options.map((opt, index) => (
                <React.Fragment key={`handle-${opt.id || index}`}>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id={`poll_option_${opt.id}`}
                        style={{ left: `${(index + 1) * (100 / (step.poll_options.length + 1))}%`, background: '#0275d8' }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: -25,
                        left: `${(index + 1) * (100 / (step.poll_options.length + 1))}%`,
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        background: '#f7f7f7',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        border: '1px solid #ddd'
                    }}>{opt.trigger_keyword || `Opção ${index + 1}`}</div>
                </React.Fragment>
            ))}
        </>
    );
}

export default FlowStepNode;