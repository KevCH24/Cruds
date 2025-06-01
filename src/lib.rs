#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec, Address};

#[contract]
pub struct UniqueCRUD;

#[contractimpl]
impl UniqueCRUD {
    // Versión mejorada con owner y timestamps
    pub fn create(env: Env, id: Symbol, value: Symbol, owner: Address) {
        let timestamp = env.ledger().timestamp();
        env.storage().persistent().set(
            &id, 
            &vec![
                &env, 
                value, 
                owner.clone().into(),
                timestamp.into()
            ]
        );
    }

    pub fn read(env: Env, id: Symbol) -> Vec<Symbol> {
        env.storage().persistent().get(&id).unwrap_or_else(|| vec![&env])
    }

    // Solo el owner puede actualizar
    pub fn update(env: Env, id: Symbol, new_value: Symbol, caller: Address) {
        let entry: Vec<Symbol> = env.storage().persistent().get(&id).unwrap();
        let owner: Address = entry.get(2).unwrap().into();
        
        if caller != owner {
            panic!("Solo el owner puede actualizar");
        }
        
        env.storage().persistent().set(
            &id,
            &vec![
                &env,
                new_value,
                owner.into(),
                env.ledger().timestamp().into()
            ]
        );
    }

    // Solo el owner puede eliminar
    pub fn delete(env: Env, id: Symbol, caller: Address) {
        let entry: Vec<Symbol> = env.storage().persistent().get(&id).unwrap();
        let owner: Address = entry.get(2).unwrap().into();
        
        if caller != owner {
            panic!("Solo el owner puede eliminar");
        }
        
        env.storage().persistent().remove(&id);
    }

    // Función adicional para verificar owner
    pub fn is_owner(env: Env, id: Symbol, address: Address) -> bool {
        let entry: Vec<Symbol> = env.storage().persistent().get(&id).unwrap();
        let owner: Address = entry.get(2).unwrap().into();
        address == owner
    }
}