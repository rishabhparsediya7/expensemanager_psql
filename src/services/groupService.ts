import pg  from 'pg';
import config from '../database';
class GroupService {
    async getGroupList(userId: string) {
        let dbClient
        try {
            dbClient = new pg.Client(config)
            dbClient
              .connect()
              .then(() => {
                console.log("database connected sucesfully!")
              })
              .catch((err) => console.log(err))
            const {rows: groups} = await dbClient.query({
              text: `SELECT DISTINCT groups.* FROM "groupMembers" left join groups on groups.id = "groupMembers"."groupId" WHERE "groupMembers"."userId" = $1;`,
              values: [userId],
            })
        
            return {
                success: true,
              data: groups
            }
          } catch (error) {
          console.log("🚀 ~ GroupService ~ getGroupList ~ error:", error)
            return {
                success: false,
              message: error,
            }
          } finally {
            await dbClient?.end()
          }
    }
    
    async getGroupDetails(groupId: string) {
      let dbClient
      try {
          dbClient = new pg.Client(config)
          dbClient
            .connect()
            .catch((err) => console.log(err))
          const {rows: groupDetails} = await dbClient.query({
            text: `select * from groups where id = $1`,
            values: [groupId],
          })
      
          return {
              success: true,
            data: groupDetails
          }
        } catch (error) {
        console.log("🚀 ~ GroupService ~ getGroupDetails ~ error:", error)
          return {
              success: false,
            message: error,
          }
        } finally {
          await dbClient?.end()
        }
    }

    async createGroup(name: string, createdBy: string, members: string[]) {
      let dbClient;
      try {
        dbClient = new pg.Client(config);
        await dbClient.connect();
    
        // Insert group
        const { rows: group } = await dbClient.query({
          text: `INSERT INTO groups (name, "createdByUser") VALUES ($1, $2) RETURNING *`,
          values: [name, createdBy],
        });
    
        const groupId = group[0].id;
    
        // Add members to the group
        const memberValues = members.map((userId) => `('${groupId}', '${userId}')`).join(", ");
        await dbClient.query({
          text: `INSERT INTO "groupMembers" ("groupId", "userId") VALUES ${memberValues}`,
        });
    
        return {
          success: true,
          data: group[0],
        };
      } catch (error) {
        console.log("🚀 ~ GroupService ~ createGroup ~ error:", error);
        return { success: false, message: error };
      } finally {
        await dbClient?.end();
      }
    }
    
    async addMembers(groupId: string, members: string[]) {
      let dbClient;
      try {
        dbClient = new pg.Client(config);
        await dbClient.connect();
    
        const memberValues = members.map((userId) => `('${groupId}', '${userId}')`).join(", ");
        await dbClient.query({
          text: `INSERT INTO "groupMembers" ("groupId", "userId") VALUES ${memberValues}`,
        });
    
        return { success: true, message: "Members added successfully." };
      } catch (error) {
        console.log("🚀 ~ GroupService ~ addMembers ~ error:", error);
        return { success: false, message: error };
      } finally {
        await dbClient?.end();
      }
    }
    
    async removeMembers(groupId: string, members: string[]) {
      let dbClient;
      try {
        dbClient = new pg.Client(config);
        await dbClient.connect();
    
        await dbClient.query({
          text: `DELETE FROM "groupMembers" WHERE "groupId" = $1 AND "userId" = ANY($2::uuid[])`,
          values: [groupId, members],
        });
    
        return { success: true, message: "Members removed successfully." };
      } catch (error) {
        console.log("🚀 ~ GroupService ~ removeMembers ~ error:", error);
        return { success: false, message: error };
      } finally {
        await dbClient?.end();
      }
    }

    async deleteGroup(groupId: string) {
      let dbClient;
      try {
        dbClient = new pg.Client(config);
        await dbClient.connect();
    
        await dbClient.query({
          text: `DELETE FROM "groupMembers" WHERE "groupId" = $1`,
          values: [groupId],
        });

        await dbClient.query({
          text: `DELETE FROM groups WHERE id = $1`,
          values: [groupId],
        });
        

        return { success: true, message: "Group deleted successfully." };
      } catch (error) {
        console.log("🚀 ~ GroupService ~ deleteGroup ~ error:", error);
        return { success: false, message: error };
      } finally {
        await dbClient?.end();
      }
    }
    
    async updateGroupDetails(groupId: string, name: string) {
      let dbClient;
      try {
        dbClient = new pg.Client(config);
        await dbClient.connect();
    
        await dbClient.query({
          text: `UPDATE groups SET name = $1 WHERE id = $2`,
          values: [name, groupId],
        });
    
        return { success: true, message: "Group details updated successfully." };
      } catch (error) {
        console.log("🚀 ~ GroupService ~ updateGroupDetails ~ error:", error);
        return { success: false, message: error };
      } finally {
        await dbClient?.end();
      }
    }
    
    
    
}

export default new GroupService();